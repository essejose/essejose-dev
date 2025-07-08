import Image from "next/image";
import styles from "./page.module.css";

export default function Home() { 
  
  return (
    <main className={styles.main}>
      <div className={styles.center}>
        <div className="container">
          <div
            id="logo"
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
       <div className="container">
          <a  href="/games/shooter/index.html" className="button button-primary"> Thank for visiting  enjoy the game ? <span className="emoji">🚀</span></a>
       </div>
    </main>
  );
}
