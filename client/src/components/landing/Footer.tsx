/**
 * Footer — Polished startup-grade footer.
 */
import { Brain } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const footerLinks = {
  Product: ['Features', 'Dashboard', 'Integrations', 'API', 'Changelog'],
  Resources: ['Documentation', 'Blog', 'Case Studies', 'Community', 'Support'],
  Company: ['About', 'Careers', 'Press', 'Contact', 'Legal'],
};

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-black/30">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-base font-bold text-gradient">NERVE</span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed">
              Neural Engine for Revenue Execution.
              <br />
              Autonomous intelligence, human results.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10 bg-white/[0.06]" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-white/20">
            © {new Date().getFullYear()} NERVE AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((link) => (
              <a
                key={link}
                href="#"
                className="text-[11px] text-white/20 hover:text-white/40 transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
