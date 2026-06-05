import React from 'react';
import { GraduationCap, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#1e3a5f] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src="/keclogo.png" alt="KEC" className="h-10 w-10 object-contain" />
              <span className="text-white font-bold text-xl">Kantipur Engineering College</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-md">
              Affiliated to Tribhuvan University, Institute of Engineering (IOE). Offering quality engineering education since 1998 in Computer, Civil, and Electronics Communication & Information Engineering.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/#about" className="hover:text-white transition">About KEC</a></li>
              <li><a href="/#programs" className="hover:text-white transition">Programs</a></li>
              <li><a href="/#mock-exam" className="hover:text-white transition">Mock Exam</a></li>
              <li><a href="https://kec.edu.np/admission/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Admission</a></li>
              <li><a href="https://kec.edu.np/notice" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Notices</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Dhapakhel, Lalitpur<br />Nepal</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <div className="flex flex-col">
                  <a href="tel:+97715229204" className="hover:text-white transition">+977-1-5229204</a>
                  <a href="tel:+97715229005" className="hover:text-white transition">+977-1-5229005</a>
                </div>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a href="mailto:admin@kec.edu.np" className="hover:text-white transition">admin@kec.edu.np</a>
              </li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a href="https://www.facebook.com/Kantipur.Engineering.College" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition text-xs">Facebook</a>
              <a href="https://web.whatsapp.com/send?phone=97715229204" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition text-xs">WhatsApp</a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Kantipur Engineering College. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
