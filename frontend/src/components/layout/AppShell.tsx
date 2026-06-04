import type { ReactNode } from "react";
import { useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

interface AppShellProps {
  children: ReactNode;
  onPrimaryAction?: () => void;
}

const AppShell = ({ children, onPrimaryAction }: AppShellProps) => {
  const auth = useContext(AuthContext);
  const firstName = auth?.user?.f_name || "Banker";

  return (
    <div className="appShell">
      <Sidebar />
      <div className="appShell__main">
        <TopNav userName={firstName} onPrimaryAction={onPrimaryAction} />
        <main className="appShell__content">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
