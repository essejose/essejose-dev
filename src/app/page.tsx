import Image from "next/image";
import styles from "./page.module.css";
import Link from "next/link";
import { Terminal, TypingAnimation, AnimatedSpan } from "@/components/ui/terminal"

export default function Home() { 
  
  return (
    <main className="p-20 w-full h-full flex flex-col md:flex-row md:justify-between md:items-center">
      <div className="w-full min-h-full flex justify-center items-center">
      <div className={styles.center}>
        <div className="container ">
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
      </div>
      <div className="w-full h-auto flex justify-center items-center"> 
      <Terminal className="max-h-auto min-h-full">
  <TypingAnimation className="text-white">&gt; git log --oneline --author=&quot;me&quot;</TypingAnimation>
  <AnimatedSpan className="text-green-500">
    ✔ Initialized awesome portfolio
  </AnimatedSpan>
  <AnimatedSpan className="text-green-500">
    ✔ Fixed: &quot;It works on my machine&quot; bug
  </AnimatedSpan>
  <AnimatedSpan className="text-green-500">
    ✔ Added: Coffee dependency injection
  </AnimatedSpan>
  <AnimatedSpan className="text-green-500">
    ✔ Refactored: Life for better performance
  </AnimatedSpan>

  
  <TypingAnimation className="text-blue-500">&gt; yarn run games</TypingAnimation>
  <AnimatedSpan className="text-muted-foreground">
    yarn run v94.22.19
  </AnimatedSpan>
  <AnimatedSpan className="text-muted-foreground">
    $ next dev
  </AnimatedSpan>
  <AnimatedSpan className="text-cyan-500">
    ▲ Next.js 914.2.8
  </AnimatedSpan>
  <AnimatedSpan className="text-muted-foreground">
    - Local:{" "}
    <Link href="/games" className="transition-colors hover:text-green-500 inline-flex font-mono underline">
      http://localhost:3000/games
    </Link>
  </AnimatedSpan>
  <AnimatedSpan className="text-green-500">
    ✓ Starting...
  </AnimatedSpan>
  <AnimatedSpan className="text-green-500">
   x ah ah ah ! you didn&apos;t say the magic word! 🪄
  </AnimatedSpan>
  <AnimatedSpan delay={5000} className="text-green-500">
    ✓ Ready in 299792458 ms? 
  </AnimatedSpan>
  <AnimatedSpan delay={6000} className="text-yellow-500">
    ○ Compiling /games...
  </AnimatedSpan>
  <AnimatedSpan delay={7000} className="text-green-500">
    ✓ Compiled successfully
  </AnimatedSpan>
  
  <AnimatedSpan delay={8000} className="text-muted-foreground">
    &gt;{" "}
    <Link id="games-link" href="/games" className="transition-colors hover:text-green-500 inline-flex font-mono animate-blink-bright">
    <span className="animate-blink">...</span> [Click to open games 🚀] <span className="animate-blink">...</span>
  </Link>
  </AnimatedSpan>
</Terminal>
      </div>
    </main>
  );
}
