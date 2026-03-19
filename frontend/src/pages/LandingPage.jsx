import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="bg-light min-h-screen pb-20 relative overflow-hidden">
      {/* Background SVG Pattern matching User Request with Colorful Glow */}
      <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-full max-w-[800px] h-auto opacity-70 pointer-events-none z-0">
        <svg viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
          <defs>
            <marker id="arrow-purple" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#5308ce"/>
            </marker>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#3558f3"/>
            </marker>
            <marker id="arrow-orange" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#F56029"/>
            </marker>
            
            {/* Glow Filters */}
            <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            <filter id="glow-orange" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Group for Purple Elements */}
          <g filter="url(#glow-purple)" stroke="#5308ce" strokeWidth="2.5" fill="none" markerEnd="url(#arrow-purple)">
            <path d="M 180 320 L 220 370 L 270 300 L 320 380"/>
            <path d="M 370 280 L 410 330 L 460 270"/>
            <path d="M 340 430 L 390 480"/>
          </g>
          <g fill="#5308ce" filter="url(#glow-purple)">
            <circle cx="180" cy="320" r="4"/>
            <circle cx="220" cy="370" r="4"/>
            <circle cx="270" cy="300" r="4"/>
            <circle cx="370" cy="280" r="4"/>
            <circle cx="410" cy="330" r="4"/>
            <circle cx="340" cy="430" r="4"/>
          </g>

          {/* Group for Blue Elements */}
          <g filter="url(#glow-blue)" stroke="#3558f3" strokeWidth="2.5" fill="none" markerEnd="url(#arrow-blue)">
            <path d="M 320 520 L 270 560 L 310 610"/>
            <path d="M 390 620 L 440 580 L 480 630 L 530 600"/>
          </g>
          <g fill="#3558f3" filter="url(#glow-blue)">
            <circle cx="320" cy="520" r="4"/>
            <circle cx="270" cy="560" r="4"/>
            <circle cx="390" cy="620" r="4"/>
            <circle cx="440" cy="580" r="4"/>
            <circle cx="480" cy="630" r="4"/>
          </g>

          {/* Group for Orange Elements */}
          <g filter="url(#glow-orange)" stroke="#F56029" strokeWidth="2.5" fill="none" markerEnd="url(#arrow-orange)">
            <path d="M 330 680 L 370 730"/>
            <path d="M 360 660 L 400 710"/>
          </g>
          <g fill="#F56029" filter="url(#glow-orange)">
            <circle cx="330" cy="680" r="4"/>
            <circle cx="360" cy="660" r="4"/>
          </g>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 relative z-10">
        
        {/* HERO SECTION */}
        <div className="text-center mt-10 md:mt-24 mb-24 max-w-3xl mx-auto flex flex-col items-center justify-center relative">
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-dark tracking-tighter mb-6 leading-tight drop-shadow-sm">
            Navigation Without <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-alt drop-shadow-md">Barriers</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-2xl font-medium bg-white/40 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white/50">
             An AI-driven routing and urban mobility platform mapping accessible paths, detecting traffic anomalies, and matching rapid volunteer support at scale.
          </p>
          <div className="flex gap-4">
             <Link to="/login" className="px-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-alt hover:-translate-y-1 transition-all duration-300 shadow-[0_8px_30px_rgb(83,8,206,0.5)]">
               Get Started
             </Link>
             <button className="px-8 py-3.5 bg-white/80 backdrop-blur-sm border-2 border-primary-alt/30 text-primary-alt font-bold rounded-xl hover:bg-white hover:border-primary-alt hover:shadow-lg transition-all duration-300">
               Explore Map
             </button>
          </div>
        </div>

        {/* MAP CONTAINER (Under Hero) */}
        <div className="w-full relative mx-auto bg-gray-100 rounded-[2rem] border-[8px] border-white shadow-[0_20px_60px_rgb(0,0,0,0.15)] overflow-hidden h-[500px]">
          {/* Faux Window Controls */}
          <div className="absolute top-4 left-5 flex gap-2 z-20">
             <div className="w-3 h-3 rounded-full bg-red-400"></div>
             <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
             <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          
          {/* Overlay Map UI Mockup */}
          <div className="absolute right-5 top-5 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-100 w-64 z-20">
             <div className="font-bold text-dark text-sm mb-2 border-b pb-2">Accessibility Overlay</div>
             <div className="space-y-3 mt-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-gray-700">
                   <span className="w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_rgb(83,8,206,0.6)]"></span> Paved / Wheelchair Safe
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-gray-700">
                   <span className="w-3 h-3 bg-secondary rounded-full shadow-[0_0_8px_rgb(245,96,41,0.6)]"></span> Elevated Risk / Stairs
                </div>
             </div>
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-gray-100 z-20 flex items-center gap-4 hover:scale-105 transition-transform cursor-pointer">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgb(34,197,94)]"></div>
             <span className="text-sm font-bold text-dark">Live AI Tracking Active</span>
          </div>

          {/* Map Image Placeholder (Stylized Map representation) */}
          <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat mix-blend-multiply z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-primary-alt/10 z-10 pointer-events-none"></div>
          
          {/* Simple procedural generated route path on the map */}
          <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
             <path d="M 100 400 Q 250 350 300 200 T 600 150" fill="none" stroke="var(--color-primary)" strokeWidth="6" strokeLinecap="round" strokeDasharray="10 10" style={{ filter: 'drop-shadow(0px 0px 8px rgba(83,8,206,0.4))' }}>
                <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite" />
             </path>
             <circle cx="100" cy="400" r="8" fill="var(--color-secondary)" className="animate-pulse" style={{ filter: 'drop-shadow(0px 0px 10px rgba(245,96,41,0.8))' }} />
             <circle cx="600" cy="150" r="12" fill="var(--color-primary)" style={{ filter: 'drop-shadow(0px 0px 10px rgba(83,8,206,0.8))' }} />
             <circle cx="600" cy="150" r="4" fill="white" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
