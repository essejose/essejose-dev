import Link from "next/link";
import { Terminal, TypingAnimation, AnimatedSpan } from "@/components/ui/terminal";

export default function NotFound() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        <div className="text-center mb-4">
          <h1 className="text-6xl font-bold mb-2 text-red-500">404</h1>
          <p className="text-xl text-muted-foreground">Página não encontrada</p>
        </div>
        
        <Terminal className="max-h-auto min-h-full w-full">
          <TypingAnimation className="text-red-500">
            &gt; error 404: page not found
          </TypingAnimation>
          <AnimatedSpan className="text-muted-foreground">
            ──────────────────────────────────────
          </AnimatedSpan>
          <AnimatedSpan className="text-yellow-500">
            ⚠ Warning: The requested resource does not exist
          </AnimatedSpan>
          <AnimatedSpan className="text-muted-foreground">
            {" "}
          </AnimatedSpan>
          <TypingAnimation className="text-blue-500">
            &gt; ls -la /
          </TypingAnimation>
          <AnimatedSpan className="text-green-500">
            drwxr-xr-x  /home
          </AnimatedSpan>
          <AnimatedSpan className="text-green-500">
            drwxr-xr-x  /games
          </AnimatedSpan>
          <AnimatedSpan className="text-green-500">
            -rw-r--r--  /index.html
          </AnimatedSpan>
          <AnimatedSpan className="text-muted-foreground">
            {" "}
          </AnimatedSpan>
          <TypingAnimation className="text-blue-500">
            &gt; cd /
          </TypingAnimation>
          <AnimatedSpan className="text-green-500">
            ✓ Changed directory to home
          </AnimatedSpan>
          <AnimatedSpan className="text-muted-foreground">
            {" "}
          </AnimatedSpan>
          <AnimatedSpan delay={2000} className="text-muted-foreground">
            {" "}
          </AnimatedSpan>
          <AnimatedSpan delay={2000} className="text-muted-foreground">
            &gt;{" "}
            <Link 
              href="/" 
              className="transition-colors hover:text-green-500 inline-flex font-mono underline text-cyan-500"
            >
              cd /home
            </Link>
                {" "}← Back to home
            </AnimatedSpan>
          <AnimatedSpan delay={3000} className="text-muted-foreground">
            {" "}
          </AnimatedSpan>
          <AnimatedSpan delay={3000} className="text-muted-foreground">
            &gt;{" "}
            <Link 
              href="/games" 
              className="transition-colors hover:text-green-500 inline-flex font-mono underline text-cyan-500"
            >
              cd /games
            </Link>
            {" "}← Open games
          </AnimatedSpan>
        </Terminal>
      </div>
    </main>
  );
}

