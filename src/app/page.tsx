import Image from "next/image";
import styles from "./page.module.css";
import Link from "next/link";

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
      <Link 
        href="/games"
        className="transition-colors"
      >
        Thank for visiting  enjoy the game ? ( click here to play <span className="emoji"> 🚀 </span> )
      </Link>
    </main>
  );
}
