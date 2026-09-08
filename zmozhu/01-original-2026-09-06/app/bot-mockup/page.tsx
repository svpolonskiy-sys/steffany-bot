import type { Metadata } from "next";

// Внутрішній макет екрана Telegram для скріншотів. Свідомо повторює
// кольори самого Telegram, тому контраст тут не наш і не правиться.
// Ховаємо від пошукових систем: це не сторінка сайту.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function BotMockup() {
  const keyboardButtons = [
    "⚖️ Зважитись",
    "💗 Підтримка",
    "📈 Мій прогрес",
    "🌅 Ранковий чекін",
    "🌙 Вечірній чекін",
    "🎯 Моя ціль",
  ];

  return (
    <div className="fixed inset-0 z-50 w-full h-full flex items-center justify-center bg-neutral-200 overflow-auto py-10">
      {/* Phone frame */}
      <div className="relative w-[375px] h-[812px] bg-black rounded-[50px] shadow-2xl p-[10px]">
        <div className="w-full h-full bg-white rounded-[40px] overflow-hidden flex flex-col relative">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[28px] bg-black rounded-b-2xl z-20" />

          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[13px] font-semibold text-black">
            <span>09:41</span>
            <div className="flex items-center gap-1">
              <span>📶</span>
              <span>📡</span>
              <span>🔋</span>
            </div>
          </div>

          {/* Telegram header */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-neutral-200">
            <span className="text-[#3390EC] text-[17px]">‹ Назад</span>
            <div className="flex-1 flex flex-col items-center">
              <span className="font-semibold text-[16px] leading-tight">ЗМОЖУ Bot</span>
              <span className="text-[12px] text-neutral-400 leading-tight">бот</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-white text-[10px] font-bold">
              ЗМОЖУ
            </div>
          </div>

          {/* Chat background */}
          <div
            className="flex-1 px-3 py-4 flex flex-col gap-2 overflow-hidden"
            style={{
              backgroundColor: "#E6EBEE",
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 40%)",
            }}
          >
            <div className="self-center bg-black/10 text-neutral-600 text-[12px] px-3 py-1 rounded-full mb-2">
              Сьогодні
            </div>

            <div className="self-start bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
              <p className="text-[15px] leading-snug text-black">
                Привіт! 👋
                <br />
                Я допоможу тобі тримати фокус і рухатись до мети 💪
              </p>
              <span className="block text-right text-[11px] text-neutral-400 mt-1">
                09:41
              </span>
            </div>

            <div className="self-start bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
              <p className="text-[15px] leading-snug text-black">Обери дію нижче:</p>
              <span className="block text-right text-[11px] text-neutral-400 mt-1">
                09:41
              </span>
            </div>
          </div>

          {/* Message input row */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-neutral-200 bg-white">
            <span className="text-[#3390EC] text-[20px]">☰</span>
            <span className="text-neutral-400 text-[18px]">📎</span>
            <div className="flex-1 bg-neutral-100 rounded-full px-4 py-2 text-[14px] text-neutral-400">
              Повідомлення...
            </div>
            <span className="text-neutral-400 text-[18px]">🎤</span>
          </div>

          {/* Reply keyboard — realistic Telegram style: plain grey buttons */}
          <div className="grid grid-cols-2 gap-[6px] px-2 pb-4 pt-2 bg-white">
            {keyboardButtons.map((label) => (
              <div
                key={label}
                className="bg-[#F0F0F0] active:bg-[#E2E2E2] rounded-lg py-3 text-center text-[14.5px] font-normal text-black border border-neutral-200"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="w-[134px] h-[5px] bg-black/80 rounded-full self-center mb-2" />
        </div>
      </div>
    </div>
  );
}
