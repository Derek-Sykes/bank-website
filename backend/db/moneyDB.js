import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

const EXCLUDED_ITEM_STATUSES = ["FULLY_FUNDED", "PURCHASED", "CANCELLED"];

const toCents = (value) => Math.round(Number(value) * 100);
const fromCents = (value) => Number((value / 100).toFixed(2));

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName],
  );

  return rows[0].count > 0;
}

async function addColumnIfMissing(
  connection,
  tableName,
  columnName,
  definition,
) {
  if (!(await columnExists(connection, tableName, columnName))) {
    await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
}

async function ensureMoneySchema(connection) {
  await addColumnIfMissing(
    connection,
    "category",
    "allocation_percentage",
    "allocation_percentage DECIMAL(5,2) NOT NULL DEFAULT 0",
  );
  await addColumnIfMissing(
    connection,
    "category",
    "unallocated_balance",
    "unallocated_balance DECIMAL(12,2) NOT NULL DEFAULT 0",
  );
  await addColumnIfMissing(
    connection,
    "category",
    "total_balance",
    "total_balance DECIMAL(12,2) NOT NULL DEFAULT 0",
  );
  await addColumnIfMissing(
    connection,
    "item",
    "allocation_percentage",
    "allocation_percentage DECIMAL(5,2) NOT NULL DEFAULT 0",
  );
  await addColumnIfMissing(
    connection,
    "item",
    "status",
    "status ENUM('ACTIVE','FULLY_FUNDED','PURCHASED','CANCELLED') NOT NULL DEFAULT 'ACTIVE'",
  );

  await connection.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      activity_log_id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      activity_type ENUM('MONEY_ADDED','AUTO_ALLOCATED','FULLY_FUNDED_REACHED') NOT NULL,
      amount DECIMAL(12,2) DEFAULT NULL,
      note VARCHAR(255) DEFAULT NULL,
      metadata JSON DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (activity_log_id),
      INDEX activity_log_user_id_idx (user_id),
      CONSTRAINT activity_log_user_id_fk FOREIGN KEY (user_id) REFERENCES user (user_id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS notification (
      notification_id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      type ENUM('MONEY_ADDED','AUTO_ALLOCATED','FULLY_FUNDED_REACHED') NOT NULL,
      title VARCHAR(120) NOT NULL,
      message VARCHAR(255) NOT NULL,
      metadata JSON DEFAULT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (notification_id),
      INDEX notification_user_id_idx (user_id),
      CONSTRAINT notification_user_id_fk FOREIGN KEY (user_id) REFERENCES user (user_id) ON DELETE CASCADE
    )
  `);
}

async function createActivityLog(
  connection,
  userId,
  activityType,
  amount,
  note,
  metadata,
) {
  await connection.query(
    `
      INSERT INTO activity_log (user_id, activity_type, amount, note, metadata)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      userId,
      activityType,
      amount === null ? null : fromCents(amount),
      note,
      JSON.stringify(metadata ?? {}),
    ],
  );
}

async function createNotification(
  connection,
  userId,
  type,
  title,
  message,
  metadata,
) {
  await connection.query(
    `
      INSERT INTO notification (user_id, type, title, message, metadata)
      VALUES (?, ?, ?, ?, ?)
    `,
    [userId, type, title, message, JSON.stringify(metadata ?? {})],
  );
}

function allocateByPercentage(totalCents, rows, distributeRemainder = true) {
  if (totalCents <= 0 || rows.length === 0) {
    return { allocations: [], leftoverCents: totalCents };
  }

  const rawPercentSum = rows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.allocation_percentage) || 0),
    0,
  );
  const percentageSum = rawPercentSum > 0 ? rawPercentSum : rows.length;
  let allocatedCents = 0;
  const allocations = rows.map((row) => {
    const weight =
      rawPercentSum > 0
        ? Math.max(0, Number(row.allocation_percentage) || 0)
        : 1;
    const cents = Math.floor((totalCents * weight) / percentageSum);
    allocatedCents += cents;
    return { row, cents };
  });

  if (distributeRemainder) {
    let remainder = totalCents - allocatedCents;
    for (const allocation of allocations) {
      if (remainder <= 0) break;
      allocation.cents += 1;
      remainder -= 1;
    }
  }

  return {
    allocations,
    leftoverCents: Math.max(
      0,
      totalCents -
        allocations.reduce((sum, allocation) => sum + allocation.cents, 0),
    ),
  };
}

export async function addMoney(userId, amount, note = null) {
  const depositCents = toCents(amount);

  if (!Number.isFinite(depositCents) || depositCents <= 0) {
    return { error: "Amount must be greater than 0." };
  }

  const connection = await pool.getConnection();

  try {
    await ensureMoneySchema(connection);
    await connection.beginTransaction();

    const [mainAccounts] = await connection.query(
      `
        SELECT *
        FROM item
        WHERE user_id = ? AND category_id IS NULL
        ORDER BY item_id ASC
        LIMIT 1
        FOR UPDATE
      `,
      [userId],
    );

    if (mainAccounts.length === 0) {
      throw new Error("Main Account not found.");
    }

    const mainAccount = mainAccounts[0];
    const mainBalanceCents = toCents(mainAccount.balance ?? 0);
    const afterDepositMainBalanceCents = mainBalanceCents + depositCents;

    if (afterDepositMainBalanceCents < 0) {
      throw new Error("Main Account balance cannot become negative.");
    }

    await connection.query(
      "UPDATE item SET balance = ? WHERE item_id = ? AND user_id = ?",
      [fromCents(afterDepositMainBalanceCents), mainAccount.item_id, userId],
    );

    await createActivityLog(
      connection,
      userId,
      "MONEY_ADDED",
      depositCents,
      note,
      {
        main_account_id: mainAccount.item_id,
      },
    );
    await createNotification(
      connection,
      userId,
      "MONEY_ADDED",
      "Money added",
      `$${fromCents(depositCents).toFixed(2)} was added to your Main Account.`,
      { amount: fromCents(depositCents), note },
    );

    const [categories] = await connection.query(
      `
        SELECT *
        FROM category
        WHERE user_id = ?
        ORDER BY category_id ASC
        FOR UPDATE
      `,
      [userId],
    );

    const fundedItems = [];
    const categoryResults = [];
    const categoryAllocationRows = categories.filter(
      (category) =>
        Math.max(0, Number(category.allocation_percentage) || 0) > 0,
    );
    const { allocations: categoryAllocations } = allocateByPercentage(
      depositCents,
      categoryAllocationRows,
    );

    let totalMovedFromMainCents = 0;

    for (const {
      row: category,
      cents: categoryPortionCents,
    } of categoryAllocations) {
      if (categoryPortionCents <= 0) continue;

      totalMovedFromMainCents += categoryPortionCents;
      let categoryUnallocatedCents = 0;
      const itemResults = [];

      await connection.query(
        `
          UPDATE category
          SET total_balance = GREATEST(0, total_balance + ?)
          WHERE category_id = ? AND user_id = ?
        `,
        [fromCents(categoryPortionCents), category.category_id, userId],
      );

      const [activeItems] = await connection.query(
        `
          SELECT *
          FROM item
          WHERE user_id = ?
            AND category_id = ?
            AND status = 'ACTIVE'
            AND status NOT IN (?, ?, ?)
          ORDER BY item_id ASC
          FOR UPDATE
        `,
        [userId, category.category_id, ...EXCLUDED_ITEM_STATUSES],
      );

      if (activeItems.length === 0) {
        categoryUnallocatedCents = categoryPortionCents;
      } else {
        const {
          allocations: itemAllocations,
          leftoverCents: itemRoundingLeftoverCents,
        } = allocateByPercentage(categoryPortionCents, activeItems, false);
        categoryUnallocatedCents += itemRoundingLeftoverCents;

        let allocatedToItemsCents = 0;
        for (const { row: item, cents: desiredCents } of itemAllocations) {
          if (desiredCents <= 0) continue;

          const currentBalanceCents = toCents(item.balance ?? 0);
          const costCents = item.cost === null ? null : toCents(item.cost);
          const remainingNeedCents =
            costCents === null
              ? desiredCents
              : Math.max(0, costCents - currentBalanceCents);
          const appliedCents = Math.min(desiredCents, remainingNeedCents);
          const itemRemainderCents = desiredCents - appliedCents;
          categoryUnallocatedCents += itemRemainderCents;

          if (appliedCents <= 0) continue;

          const newBalanceCents = currentBalanceCents + appliedCents;
          const reachedFullyFunded =
            costCents !== null && newBalanceCents >= costCents;

          await connection.query(
            `
              UPDATE item
              SET balance = ?, status = CASE WHEN ? THEN 'FULLY_FUNDED' ELSE status END
              WHERE item_id = ? AND user_id = ?
            `,
            [
              fromCents(newBalanceCents),
              reachedFullyFunded,
              item.item_id,
              userId,
            ],
          );

          allocatedToItemsCents += appliedCents;
          itemResults.push({
            item_id: item.item_id,
            name: item.name,
            allocated: fromCents(appliedCents),
            balance: fromCents(newBalanceCents),
            fully_funded: reachedFullyFunded,
          });

          if (reachedFullyFunded) {
            fundedItems.push({
              item_id: item.item_id,
              name: item.name,
              category_id: category.category_id,
              balance: fromCents(newBalanceCents),
              cost: fromCents(costCents),
            });
            await createActivityLog(
              connection,
              userId,
              "FULLY_FUNDED_REACHED",
              appliedCents,
              null,
              {
                item_id: item.item_id,
                category_id: category.category_id,
                item_name: item.name,
              },
            );
            await createNotification(
              connection,
              userId,
              "FULLY_FUNDED_REACHED",
              "Goal fully funded",
              `${item.name} is now fully funded.`,
              { item_id: item.item_id, category_id: category.category_id },
            );
          }
        }

        categoryUnallocatedCents += Math.max(
          0,
          categoryPortionCents -
            allocatedToItemsCents -
            categoryUnallocatedCents,
        );
      }

      if (categoryUnallocatedCents > 0) {
        await connection.query(
          `
            UPDATE category
            SET unallocated_balance = GREATEST(0, unallocated_balance + ?)
            WHERE category_id = ? AND user_id = ?
          `,
          [fromCents(categoryUnallocatedCents), category.category_id, userId],
        );
      }

      const allocatedToItems = itemResults.reduce(
        (sum, item) => sum + toCents(item.allocated),
        0,
      );
      const categoryResult = {
        category_id: category.category_id,
        name: category.name,
        received: fromCents(categoryPortionCents),
        allocated_to_items: fromCents(allocatedToItems),
        unallocated: fromCents(categoryUnallocatedCents),
        items: itemResults,
      };
      categoryResults.push(categoryResult);

      await createActivityLog(
        connection,
        userId,
        "AUTO_ALLOCATED",
        categoryPortionCents,
        null,
        categoryResult,
      );
    }

    const finalMainBalanceCents =
      afterDepositMainBalanceCents - totalMovedFromMainCents;
    if (finalMainBalanceCents < 0) {
      throw new Error("Main Account balance cannot become negative.");
    }

    await connection.query(
      "UPDATE item SET balance = ? WHERE item_id = ? AND user_id = ?",
      [fromCents(finalMainBalanceCents), mainAccount.item_id, userId],
    );

    if (totalMovedFromMainCents > 0) {
      await createNotification(
        connection,
        userId,
        "AUTO_ALLOCATED",
        "Money auto-allocated",
        `$${fromCents(totalMovedFromMainCents).toFixed(2)} was allocated to your categories.`,
        { categories: categoryResults },
      );
    }

    await connection.commit();

    return {
      amount_added: fromCents(depositCents),
      note,
      main_account: {
        item_id: mainAccount.item_id,
        balance: fromCents(finalMainBalanceCents),
        retained: fromCents(depositCents - totalMovedFromMainCents),
      },
      allocated_total: fromCents(totalMovedFromMainCents),
      categories: categoryResults,
      fully_funded_items: fundedItems,
    };
  } catch (error) {
    await connection.rollback();
    console.log("Error adding money:", error);
    return { error: error.message || "Error adding money." };
  } finally {
    connection.release();
  }
}
