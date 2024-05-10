import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {

  const sendToGoogleAnalytics = () => {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: "event",
      eventCategory: "click",
      eventAction: "click",
      eventLabel: "Logo",
      eventValue: 1,
    });
  }


  return (
    <main className={styles.main}>
      <div className={styles.center}>
        <div className="container">
          <div
            onClick={sendToGoogleAnalytics}
            className="stack"
            style={{ "--stacks": 3 } as React.CSSProperties}
          >
            <span style={{ "--index": 0 } as React.CSSProperties}>
              Essejose
            </span>
            <span style={{ "--index": 1 } as React.CSSProperties}>
              Essejose
            </span>
            <span style={{ "--index": 2 } as React.CSSProperties}>
              Essejose
            </span>
          </div>
          <span className="right">Dev</span>
        </div>
      </div>
    </main>
  );
}
