"use client";

import { useEffect, useRef, useState } from "react";

export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = "",
  ariaLabel = "Filter items",
}) {
  const [activeRect, setActiveRect] = useState({ left: 0, width: 0, ready: false });
  const [hoverRect, setHoverRect] = useState({ left: 0, width: 0, visible: false });
  const tabRefs = useRef({});

  // Measure and align the active indicator
  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      setActiveRect({
        left: el.offsetLeft,
        width: el.offsetWidth,
        ready: true,
      });
    }

    const handleResize = () => {
      const current = tabRefs.current[activeTab];
      if (current) {
        setActiveRect({
          left: current.offsetLeft,
          width: current.offsetWidth,
          ready: true,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab, tabs]);

  const handleMouseEnter = (id) => {
    const el = tabRefs.current[id];
    if (el && id !== activeTab) {
      setHoverRect({
        left: el.offsetLeft,
        width: el.offsetWidth,
        visible: true,
      });
    } else {
      setHoverRect((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleMouseLeave = () => {
    setHoverRect((prev) => ({ ...prev, visible: false }));
  };

  const handleClick = (id) => {
    setHoverRect((prev) => ({ ...prev, visible: false }));
    onChange(id);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center p-1 lg:p-1.5 bg-slate-100 rounded-lg lg:rounded-xl border border-slate-200 overflow-x-auto ${className}`}
    >
      {/* Gliding hover indicator */}
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 lg:top-1.5 lg:bottom-1.5 bg-slate-200/70 rounded-md lg:rounded-lg transition-all duration-200 ease-out pointer-events-none"
        style={{
          left: `${hoverRect.left}px`,
          width: `${hoverRect.width}px`,
          opacity: hoverRect.visible ? 1 : 0,
        }}
      />

      {/* Smooth sliding active pill */}
      {activeRect.ready && (
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 lg:top-1.5 lg:bottom-1.5 bg-white rounded-md lg:rounded-lg shadow-sm border border-slate-200/60 transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: `${activeRect.left}px`,
            width: `${activeRect.width}px`,
          }}
        />
      )}

      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (node) tabRefs.current[tab.id] = node;
            }}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => handleClick(tab.id)}
            onMouseEnter={() => handleMouseEnter(tab.id)}
            className={`relative z-10 inline-flex items-center justify-center px-4 py-2 lg:px-5 lg:py-3 text-sm lg:text-lg font-medium rounded-md lg:rounded-lg min-h-[44px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap ${
              isActive
                ? !activeRect.ready
                  ? "bg-white text-slate-900 shadow-sm font-semibold lg:font-bold"
                  : "text-slate-900 font-semibold lg:font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
