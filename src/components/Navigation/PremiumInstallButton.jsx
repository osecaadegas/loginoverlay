import { useEffect, useState } from "react";
import { Download, MonitorDown } from "lucide-react";
import { useAdmin } from "../../hooks/useAdmin";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function PremiumInstallButton() {
  const { isPremium, loading } = useAdmin();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setNotice("Streamers Center is installed.");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (loading || !isPremium || installed) return null;

  const install = async () => {
    if (!installPrompt) {
      setNotice("To install, use your browser menu and choose Install app or Install this site as an app.");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setNotice(choice?.outcome === "accepted" ? "Installing Streamers Center…" : "Installation was cancelled.");
    setInstallPrompt(null);
  };

  return (
    <>
      <button type="button" className="topnav-account topnav-install" onClick={install} aria-label="Install Streamers Center on this device" title="Install Streamers Center">
        {installPrompt ? <Download size={17} /> : <MonitorDown size={17} />}
        <span>Install app</span>
      </button>
      <span className="sr-only" aria-live="polite">{notice}</span>
    </>
  );
}
