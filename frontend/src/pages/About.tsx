import React from "react";
import { Link } from "react-router-dom";

const About: React.FC = () => {
  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>About BudgetWise</h1>
        <nav style={styles.nav}>
          <Link to="/" style={styles.navLink}>
            Home
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Our Mission</h2>
          <p style={styles.sectionText}>
            BudgetWise is designed to help you take control of your finances by
            tracking your spending and saving goals. Instead of overspending on
            impulse purchases, BudgetWise lets you allocate money into mini
            accounts for future plans—whether it’s a dream vacation, a new
            gadget, or a big purchase down the road.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <p style={styles.sectionText}>
            Once you sign up with your email, you can create various category
            boxes (or lists) that house your mini accounts. Each mini account
            represents a savings goal for an item, trip, or experience. Money is
            allocated from your main (spontaneous) account to these mini
            accounts, so you always know exactly where your funds are going.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Key Features</h2>
          <ul style={styles.list}>
            <li>Track your main account and mini accounts in one place</li>
            <li>Set and monitor savings goals for each mini account</li>
            <li>
              Reallocate funds easily—simulate a purchase without spending
              actual money
            </li>
            <li>
              Prioritize mini accounts globally or within categories, with
              scheduled savings plans and no-earlier-than dates
            </li>
            <li>
              Connect multiple bank accounts (using Plaid) for live account
              details
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Future Plans</h2>
          <p style={styles.sectionText}>
            We’re continuously improving BudgetWise by adding more robust
            budgeting tools, enhanced security features like encryption and
            session management, and deeper integrations with your financial
            institutions. Our goal is to make smart money management effortless.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © {new Date().getFullYear()} BudgetWise. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    color: "#333",
    lineHeight: 1.6,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #ddd",
    paddingBottom: "10px",
    marginBottom: "20px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
    margin: 0,
  },
  nav: {
    display: "flex",
    gap: "20px",
  },
  navLink: {
    textDecoration: "none",
    fontSize: "16px",
    color: "#007bff",
  },
  mainContent: {
    marginBottom: "40px",
  },
  section: {
    marginBottom: "30px",
  },
  sectionTitle: {
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "10px",
    color: "#007bff",
  },
  sectionText: {
    fontSize: "16px",
    marginBottom: "10px",
  },
  list: {
    fontSize: "16px",
    marginLeft: "20px",
  },
  footer: {
    borderTop: "1px solid #ddd",
    paddingTop: "10px",
    textAlign: "center",
  },
  footerText: {
    fontSize: "14px",
    color: "#666",
  },
};

export default About;
