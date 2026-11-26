import App from "./App";
import { MaintenanceGate } from "./maintenance";

/** The public website, replaced by the maintenance page when switched on. */
export default function PublicGate() {
  return (
    <MaintenanceGate>
      <App />
    </MaintenanceGate>
  );
}
