import type {ReactNode} from 'react';
export const BUSINESS_SETTINGS=['Payouts & Bank','Business Profile','Photos & Gallery','Opening Hours','Location & Contact','Staff & Access','Help & Support'] as const;
type Palette={bg:string;surface:string;ink:string;muted:string;border:string;accent:string};
export default function BusinessSettings({businessName,palette,onBack,onSelect,detailTitle,children,extraItems=[]}:{businessName:string;palette:Palette;onBack:()=>void;onSelect:(item:string)=>void;detailTitle?:string;children?:ReactNode;extraItems?:string[]}){
 const {bg,surface,ink,muted,border,accent:ACCENT}=palette;
 const isDetail=!!detailTitle,items=[...BUSINESS_SETTINGS,...extraItems];
 return (
      <div
        className="min-h-screen w-full font-[family-name:var(--font-ui)] md:pl-24"
        style={{ background: bg }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 sticky top-0 z-10 px-5 pt-14 pb-4"
          style={{ background: bg }}
        >
          <button aria-label={isDetail ? "Back to settings" : "Back to dashboard"}
            onClick={() =>
              onBack()
            }
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: surface, border: `1px solid ${border}` }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={ink}
              strokeWidth="2.5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: ACCENT }}
            >
              {businessName}
            </p>
            <p
              className="text-[20px] font-black leading-tight"
              style={{ color: ink }}
            >
              {isDetail ? detailTitle : "Settings"}
            </p>
          </div>
        </div>

        <div
          className="overflow-y-auto [scrollbar-width:none] pb-16"
          style={{ height: "calc(100vh - 100px)" }}
        >
          {isDetail ? (
            <div
              className="mx-5 rounded-[20px] overflow-hidden"
              style={{ background: surface, border: `1px solid ${border}` }}
            >
              {children}

            </div>
          ) : (
            <div className="px-5 flex flex-col gap-4">
              {/* Settings list */}
              <div
                className="rounded-[20px] overflow-hidden"
                style={{ background: surface, border: `1px solid ${border}` }}
              >
                {items.map((item, i) => (
                  <button
                    key={item}
                    onClick={() => onSelect(item)}
                    className="flex items-center justify-between w-full px-5 py-4"
                    style={{
                      borderBottom:
                        i < items.length - 1
                          ? `1px solid ${border}`
                          : "none",
                    }}
                  >
                    <p
                      className="text-[14px] font-semibold"
                      style={{ color: ink }}
                    >
                      {item}
                    </p>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={muted}
                      strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))}
              </div>

              <button
                onClick={() => onBack()}
                className="w-full rounded-[18px] py-4 text-[14px] font-black"
                style={{
                  background: surface,
                  border: `1.5px solid ${border}`,
                  color: muted,
                }}
              >
                ← Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    )
}
