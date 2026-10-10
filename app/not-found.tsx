import Link from "next/link";
import Mascot from "@/components/Mascot";
import SiteNav from "@/components/route/SiteNav";

export default function NotFound() {
  return (
    <div className="flow">
      <SiteNav current={null} />
      <main className="flow-main" style={{ paddingTop: 40 }}>
        <div className="kicker"><span>404</span><span>Off route</span></div>
        <h1 className="display h1" style={{ margin: "10px 0 18px" }}>This route<br />leads nowhere.</h1>
        <div className="pip">
          <Mascot mood="oops" size={56} />
          <div className="pip-body">
            <div className="pip-label">PIP</div>
            <div className="pip-text caps">Let&apos;s get you back on track.</div>
          </div>
        </div>
        <Link href="/" className="cta">Back to start</Link>
      </main>
    </div>
  );
}
