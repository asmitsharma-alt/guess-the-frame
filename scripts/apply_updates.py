import re
import shutil

with open('scripts/qr_insta.svg', 'r', encoding='utf-8') as f:
    insta_svg = f.read().strip()
# Ensure svg has class cw-qr-svg
if '<svg ' in insta_svg and 'class="cw-qr-svg"' not in insta_svg:
    insta_svg = insta_svg.replace('<svg ', '<svg class="cw-qr-svg" ', 1)

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update MultiplayerEngine.sections
new_sections = '''      sections: [
        {
          id: 1, name: 'Guess the Frame', icon: '<svg class="svg-icon"><use href="#icon-film" /></svg>', collapsed: false, frames: [
            { type: "image", content: "GUESSTHEFRAME/12 Angry Men (1957) - Frame 02.webp", answer: "12 ANGRY MEN", year: "1957", aliases: ["TWELVE ANGRY MEN", "12 ANGRY MEN (1957)"] },
            { type: "image", content: "GUESSTHEFRAME/2001 - A Space Odyssey (1968) - Frame 04.webp", answer: "2001: A SPACE ODYSSEY", year: "1968", aliases: ["2001 A SPACE ODYSSEY", "SPACE ODYSSEY", "2001 SPACE ODYSSEY"] },
            { type: "image", content: "GUESSTHEFRAME/Adipurush (2023).webp", answer: "ADIPURUSH", year: "2023", aliases: ["AADIPURUSH", "ADIPURUSH (2023)"] },
            { type: "image", content: "GUESSTHEFRAME/Awarapan 2.webp", answer: "AWARAPAN 2", year: "2026", aliases: ["AWARAPAN TWO", "AWARAPAN"] },
            { type: "image", content: "GUESSTHEFRAME/Back to the Future (1985) - Frame 10.webp", answer: "BACK TO THE FUTURE", year: "1985", aliases: ["BTTF", "BACK TO THE FUTURE 1"] },
            { type: "image", content: "GUESSTHEFRAME/Bad Apples (2025).webp", answer: "BAD APPLES", year: "2025", aliases: ["BAD APPLE"] },
            { type: "image", content: "GUESSTHEFRAME/Batman Begins (2005).webp", answer: "BATMAN BEGINS", year: "2005", aliases: ["BATMAN 1", "THE BATMAN BEGINS"] },
            { type: "image", content: "GUESSTHEFRAME/Buddy (2026).webp", answer: "BUDDY", year: "2026" },
            { type: "image", content: "GUESSTHEFRAME/Children of Heaven (1997).webp", answer: "CHILDREN OF HEAVEN", year: "1997", aliases: ["BACHEHA-YE ASEMAN", "BACHEHAYE ASEMAN"] },
            { type: "image", content: "GUESSTHEFRAME/Dil Chahta Hai (2001).webp", answer: "DIL CHAHTA HAI", year: "2001", aliases: ["DCH", "DIL CHAHATA HAI"] },
            { type: "image", content: "GUESSTHEFRAME/Fitoor (2016).webp", answer: "FITOOR", year: "2016" },
            { type: "image", content: "GUESSTHEFRAME/Insidious (2010).webp", answer: "INSIDIOUS", year: "2010", aliases: ["INSIDIOUS 1", "INSIDIOUS CHAPTER 1"] },
            { type: "image", content: "GUESSTHEFRAME/Laal Singh Chadda.webp", answer: "LAAL SINGH CHADDHA", year: "2022", aliases: ["LAAL SINGH CHADDA", "LAL SINGH CHADDHA", "LAL SINGH CHADDA", "FORREST GUMP HINDI"] },
            { type: "image", content: "GUESSTHEFRAME/Lage Raho Munna Bhai (2006).webp", answer: "LAGE RAHO MUNNA BHAI", year: "2006", aliases: ["LAGE RAHO MUNNABHAI", "MUNNA BHAI 2", "MUNNABHAI 2"] },
            { type: "image", content: "GUESSTHEFRAME/Mard Ko Dard Nahi Hota (2018).webp", answer: "MARD KO DARD NAHI HOTA", year: "2018", aliases: ["THE MAN WHO FEELS NO PAIN", "MKDNH"] },
            { type: "image", content: "GUESSTHEFRAME/Ocean_s Eleven (2001).webp", answer: "OCEAN'S ELEVEN", year: "2001", aliases: ["OCEANS ELEVEN", "OCEAN ELEVEN", "OCEANS 11", "OCEAN'S 11"] },
            { type: "image", content: "GUESSTHEFRAME/Saat Uchakkey (2016).webp", answer: "SAAT UCHAKKEY", year: "2016", aliases: ["SAAT UCHAKKE", "7 UCHAKKEY"] },
            { type: "image", content: "GUESSTHEFRAME/Tenzing (2026).webp", answer: "TENZING", year: "2026" },
            { type: "image", content: "GUESSTHEFRAME/The Paradise (2026).webp", answer: "THE PARADISE", year: "2026", aliases: ["PARADISE"] },
            { type: "image", content: "GUESSTHEFRAME/VisionQuest (TV Mini Series 2026).webp", answer: "VISIONQUEST", year: "2026", aliases: ["VISION QUEST", "VISIONQUEST SERIES", "VISION QUEST SERIES"] }
          ]
        },
        {
          id: 2, name: 'Guess the Dialogue', icon: '<svg class="svg-icon"><use href="#icon-message-circle" /></svg>', collapsed: false, frames: [
            { type: 'dialogue', dialogue: "What if my problem isn't that I don't understand people, but that I don't like them?", answer: "NIGHTCRAWLER", year: "2014", character: "Lou Bloom (Jake Gyllenhaal)" },
            { type: 'dialogue', dialogue: "Yeh loktantra hai... yahan bhediye bhi bhed ki khaal pehan ke ghoomte hain.", answer: "GULAAL", year: "2009", character: "Dukey Bana (Kay Kay Menon)" },
            { type: 'dialogue', dialogue: "Get busy living, or get busy dying.", answer: "THE SHAWSHANK REDEMPTION", year: "1994", character: "Andy Dufresne (Tim Robbins)", aliases: ["SHAWSHANK REDEMPTION", "SHAWSHANK"] },
            { type: 'dialogue', dialogue: "I think this just might be my masterpiece.", answer: "INGLOURIOUS BASTERDS", year: "2009", character: "Lt. Aldo Raine (Brad Pitt)", aliases: ["INGLORIOUS BASTERDS", "INGLOURIOUS BASTARDS"] },
            { type: 'dialogue', dialogue: "I'm the guy who does his job. You must be the other guy.", answer: "THE DEPARTED", year: "2006", character: "Staff Sergeant Sean Dignam (Mark Wahlberg)", aliases: ["DEPARTED"] },
            { type: 'dialogue', dialogue: "Yeh duniya kisi ki laalach ke liye nahi, zaroorat ke liye bani hai.", answer: "TUMBBAD", year: "2018", character: "Vinayak Rao (Sohum Shah)", aliases: ["TUMBADD", "TUMBAD"] },
            { type: 'dialogue', dialogue: "Inteqaam se sirf inteqaam paida hota hai.", answer: "HAIDER", year: "2014", character: "Ghazala Meer / Haider Meer (Tabu / Shahid Kapoor)" },
            { type: 'dialogue', dialogue: "Freedom is my birthright and fighting for freedom is no crime.", answer: "SARDAR UDHAM", year: "2021", character: "Sardar Udham Singh (Vicky Kaushal)", aliases: ["UDHAM SINGH"] },
            { type: 'dialogue', dialogue: "Jao pehle us aadmi ka sign le kar aao jisne mere baap ko chor kaha tha.", answer: "DEEWAAR", year: "1975", character: "Vijay Verma (Amitabh Bachchan)", aliases: ["DEEWAR"] },
            { type: 'dialogue', dialogue: "Apne hi paani mein pighal jaana barf ka muqaddar hota hai.", answer: "SWADES", year: "2004", character: "Mohan Bhargava (Shah Rukh Khan)" }
          ]
        },
        {
          id: 3, name: 'Guess the Eye', icon: '<svg class="svg-icon"><use href="#icon-eye" /></svg>', collapsed: false, frames: [
            { type: 'eye', content: 'GUESSTHEEYES/Aishwarya Rai Bachchan copy.webp', revealContent: 'GUESSTHEEYES/Aishwarya Rai Bachchan.webp', answer: 'AISHWARYA RAI BACHCHAN', displayAnswer: 'Aishwarya Rai Bachchan', year: '', aliases: ['AISHWARYA RAI', 'AISHWARYA', 'ASH'] },
            { type: 'eye', content: 'GUESSTHEEYES/Alia Bhatt copy.webp', revealContent: 'GUESSTHEEYES/Alia Bhatt.webp', answer: 'ALIA BHATT', displayAnswer: 'Alia Bhatt', year: '', aliases: ['AALIA BHATT', 'ALIA'] },
            { type: 'eye', content: 'GUESSTHEEYES/Amanda Seyfried copy.webp', revealContent: 'GUESSTHEEYES/Amanda Seyfried.webp', answer: 'AMANDA SEYFRIED', displayAnswer: 'Amanda Seyfried', year: '', aliases: ['AMANDA SIEFRIED'] },
            { type: 'eye', content: 'GUESSTHEEYES/Courteney Cox copy.webp', revealContent: 'GUESSTHEEYES/Courteney Cox.webp', answer: 'COURTENEY COX', displayAnswer: 'Courteney Cox', year: '', aliases: ['COURTNEY COX', 'MONICA GELLER'] },
            { type: 'eye', content: 'GUESSTHEEYES/Dafne Keen copy.webp', revealContent: 'GUESSTHEEYES/Dafne Keen.webp', answer: 'DAFNE KEEN', displayAnswer: 'Dafne Keen', year: '', aliases: ['DAFNE KEEN FERNANDEZ', 'X-23', 'LAURA'] },
            { type: 'eye', content: 'GUESSTHEEYES/Elizabeth Olsen copy.webp', revealContent: 'GUESSTHEEYES/Elizabeth Olsen.webp', answer: 'ELIZABETH OLSEN', displayAnswer: 'Elizabeth Olsen', year: '', aliases: ['WANDA MAXIMOFF', 'SCARLET WITCH'] },
            { type: 'eye', content: 'GUESSTHEEYES/Eva Green copy.webp', revealContent: 'GUESSTHEEYES/Eva Green.webp', answer: 'EVA GREEN', displayAnswer: 'Eva Green', year: '' },
            { type: 'eye', content: 'GUESSTHEEYES/Juhi Chawla Mehta copy.webp', revealContent: 'GUESSTHEEYES/Juhi Chawla Mehta.webp', answer: 'JUHI CHAWLA MEHTA', displayAnswer: 'Juhi Chawla Mehta', year: '', aliases: ['JUHI CHAWLA', 'JUHI'] },
            { type: 'eye', content: 'GUESSTHEEYES/Julia Roberts copy.webp', revealContent: 'GUESSTHEEYES/Julia Roberts.webp', answer: 'JULIA ROBERTS', displayAnswer: 'Julia Roberts', year: '' },
            { type: 'eye', content: 'GUESSTHEEYES/Unbiased Shaikh copy.webp', revealContent: 'GUESSTHEEYES/Unbiased Shaikh.webp', answer: 'UNBIASED SHAIKH', displayAnswer: 'Unbiased Shaikh', year: '', aliases: ['UNBIASED', 'SHAIKH', 'UNBIASED SHAIKH YOUTUBE'] }
          ]
        }
      ],'''

sections_pattern = r'sections:\s*\[[\s\S]*?\n\s*players:\s*\['
assert re.search(sections_pattern, html), 'sections pattern not found'
html = re.sub(sections_pattern, new_sections + '\n      players: [', html)
print('Replaced sections successfully')

# 2. Add QR Pop-up right side CSS
extra_qr_css = '''
    /* ── NEOBRUTALIST QR POP-UP (RIGHT SIDE / INSTAGRAM SUBMISSION) ── */
    #cwQrPopupRight {
      display: none;
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 10050;
      width: 272px;
      background: #FFFDF5;
      border: 3.5px solid #111827;
      border-radius: 18px;
      box-shadow: 6px 6px 0px #111827;
      transform: rotate(1.5deg);
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      animation: qrPopupSpringInRight 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      overflow: hidden;
      box-sizing: border-box;
    }
    #winnerScreen.active #cwQrPopupRight.active {
      display: block !important;
    }
    #cwQrPopupRight:hover {
      transform: rotate(0deg) scale(1.02);
      box-shadow: 8px 8px 0px #111827;
    }
    @keyframes qrPopupSpringInRight {
      0% {
        opacity: 0;
        transform: translateY(-20px) scale(0.85) rotate(6deg);
      }
      70% {
        transform: translateY(4px) scale(1.03) rotate(-0.5deg);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1) rotate(1.5deg);
      }
    }
    .cw-qr-header-insta {
      background: #F472B6 !important;
    }
    .cw-qr-link-badge-insta {
      background: #FDF2F8 !important;
      border-color: #BE185D !important;
      color: #9D174D !important;
    }
    .cw-qr-link-badge-insta:hover {
      background: #FCE7F3 !important;
      color: #831843 !important;
    }
    .cw-qr-pill-trigger-right {
      left: auto !important;
      right: 24px !important;
      transform: rotate(2deg) !important;
    }
    .cw-qr-pill-trigger-right:hover {
      transform: rotate(0deg) scale(1.05) translateY(-2px) !important;
    }
'''

assert '.cw-qr-popup-inner {' in html, '.cw-qr-popup-inner not found'
html = html.replace('.cw-qr-popup-inner {', extra_qr_css.strip() + '\n    .cw-qr-popup-inner {', 1)
print('Inserted QR Right CSS')

# Update responsive CSS for #cwQrPopupRight
med_1480_target = '''    @media (min-width: 1480px) {
      #cwQrPopup {
        top: 50%;
        transform: translateY(-50%) rotate(-1deg);
        left: max(24px, calc(50vw - 520px - 295px));
      }
      #cwQrPillTrigger {
        top: 50%;
        transform: translateY(-50%) rotate(-2deg);
        left: max(24px, calc(50vw - 520px - 220px));
      }
    }'''

med_1480_replacement = '''    @media (min-width: 1480px) {
      #cwQrPopup {
        top: 50%;
        transform: translateY(-50%) rotate(-1deg);
        left: max(24px, calc(50vw - 520px - 295px));
      }
      #cwQrPopupRight {
        top: 50%;
        transform: translateY(-50%) rotate(1deg);
        right: max(24px, calc(50vw - 520px - 295px));
      }
      #cwQrPillTrigger {
        top: 50%;
        transform: translateY(-50%) rotate(-2deg);
        left: max(24px, calc(50vw - 520px - 220px));
      }
      #cwQrPillTriggerRight {
        top: 50%;
        transform: translateY(-50%) rotate(2deg);
        right: max(24px, calc(50vw - 520px - 220px));
      }
    }'''

assert med_1480_target in html, 'med_1480_target not found'
html = html.replace(med_1480_target, med_1480_replacement, 1)

med_mobile_target = '''      #cwQrPopup {
        top: auto;
        bottom: 20px;
        left: 14px;
        right: 14px;
        width: auto;
        max-width: 310px;
        margin: 0 auto;
        transform: none !important;
        box-shadow: 5px 5px 0px #111827;
      }
      #cwQrPillTrigger {
        top: auto;
        bottom: 16px;
        left: 16px;
        right: auto;
        transform: none !important;
      }'''

med_mobile_replacement = '''      #cwQrPopup {
        top: auto;
        bottom: 20px;
        left: 14px;
        right: 14px;
        width: auto;
        max-width: 310px;
        margin: 0 auto;
        transform: none !important;
        box-shadow: 5px 5px 0px #111827;
      }
      #cwQrPopupRight {
        top: auto;
        bottom: 20px;
        left: 14px;
        right: 14px;
        width: auto;
        max-width: 310px;
        margin: 0 auto;
        transform: none !important;
        box-shadow: 5px 5px 0px #111827;
      }
      #cwQrPillTrigger {
        top: auto;
        bottom: 16px;
        left: 16px;
        right: auto;
        transform: none !important;
      }
      #cwQrPillTriggerRight {
        top: auto;
        bottom: 16px;
        left: auto;
        right: 16px;
        transform: none !important;
      }'''

assert med_mobile_target in html, 'med_mobile_target not found'
html = html.replace(med_mobile_target, med_mobile_replacement, 1)
print('Updated responsive media queries for QR popups')

# 3. Add Right QR Popup HTML & Right Trigger Pill
html_qr_right = f'''
    <!-- ── NEOBRUTALIST QR POP-UP CARD (OUTSIDE THE BOX - RIGHT / INSTAGRAM) ── -->
    <div id="cwQrPopupRight" class="cw-qr-popup cw-qr-popup-right active" role="dialog" aria-label="Instagram Frames Submission QR Code">
      <div class="cw-qr-popup-inner">
        <div class="cw-qr-header cw-qr-header-insta">
          <div class="cw-qr-badge">
            <span class="cw-qr-icon">📸</span>
            <span class="cw-qr-title">SUBMIT FRAMES</span>
          </div>
          <button type="button" class="cw-qr-close-btn" onclick="WinnerScreen.closeQrPopup('right')" aria-label="Close QR pop-up" title="Close pop-up">✕</button>
        </div>
        
        <div class="cw-qr-body">
          <div class="cw-qr-canvas-wrap" title="Scan to open Instagram @tanny_irl2">
            {insta_svg}
          </div>
          
          <a href="https://instagram.com/tanny_irl2" target="_blank" rel="noopener noreferrer" class="cw-qr-link-badge cw-qr-link-badge-insta" title="Open Instagram @tanny_irl2">
            <span>@tanny_irl2</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>

          <p class="cw-qr-desc">
            Agr kisiko frames bhejna ho to is scan karke contact kare Instagram <strong>tanny_irl2</strong>
          </p>
        </div>
      </div>
    </div>
'''

html_pills = '''    <!-- Floating re-open trigger pills when pop-ups are closed -->
    <button id="cwQrPillTrigger" type="button" class="cw-qr-pill-trigger" onclick="WinnerScreen.openQrPopup('left')" aria-label="Open contact QR code">
      <span class="pill-dot"></span>
      <span class="pill-icon">💼</span>
      <span class="pill-text">WORK WITH ME</span>
    </button>

    <button id="cwQrPillTriggerRight" type="button" class="cw-qr-pill-trigger cw-qr-pill-trigger-right" onclick="WinnerScreen.openQrPopup('right')" aria-label="Open Instagram frame submission QR code">
      <span class="pill-dot" style="background:#EC4899;"></span>
      <span class="pill-icon">📸</span>
      <span class="pill-text">SEND FRAMES</span>
    </button>'''

# In left popup, update close button to pass 'left'
assert 'onclick="WinnerScreen.closeQrPopup()"' in html, 'closeQrPopup onclick not found'
html = html.replace('onclick="WinnerScreen.closeQrPopup()"', 'onclick="WinnerScreen.closeQrPopup(\'left\')"', 1)

# In left pill, replace old pill with html_pills
old_pill_pattern = r'<!-- Floating re-open trigger pill when pop-up is closed -->\s*<button id="cwQrPillTrigger"[\s\S]*?</button>'
assert re.search(old_pill_pattern, html), 'old_pill_pattern not found'
html = re.sub(old_pill_pattern, html_qr_right.strip() + '\n\n' + html_pills.strip(), html, count=1)
print('Updated HTML for popups and pills')

# 4. Update JS methods in WinnerScreen
js_qr_pattern = r'openQrPopup\(\)\s*\{[\s\S]*?closeQrPopup\(\)\s*\{[\s\S]*?\},'
js_qr_replacement = '''openQrPopup(side = 'all') {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 900;
        if (side === 'left' || (side === 'all' && !isMobile) || (side === 'all' && isMobile)) {
          const popup = document.getElementById('cwQrPopup');
          const trigger = document.getElementById('cwQrPillTrigger');
          if (popup) popup.classList.add('active');
          if (trigger) trigger.classList.remove('active');
        }
        if (side === 'right' || (side === 'all' && !isMobile)) {
          const popupRight = document.getElementById('cwQrPopupRight');
          const triggerRight = document.getElementById('cwQrPillTriggerRight');
          if (popupRight) popupRight.classList.add('active');
          if (triggerRight) triggerRight.classList.remove('active');
        } else if (side === 'all' && isMobile) {
          // On mobile, show right pill so user can easily tap to view Instagram QR
          const popupRight = document.getElementById('cwQrPopupRight');
          const triggerRight = document.getElementById('cwQrPillTriggerRight');
          if (popupRight) popupRight.classList.remove('active');
          if (triggerRight) triggerRight.classList.add('active');
        }
      },

      closeQrPopup(side = 'left') {
        if (side === 'left' || side === 'all') {
          const popup = document.getElementById('cwQrPopup');
          const trigger = document.getElementById('cwQrPillTrigger');
          if (popup) popup.classList.remove('active');
          if (trigger) trigger.classList.add('active');
        }
        if (side === 'right' || side === 'all') {
          const popupRight = document.getElementById('cwQrPopupRight');
          const triggerRight = document.getElementById('cwQrPillTriggerRight');
          if (popupRight) popupRight.classList.remove('active');
          if (triggerRight) triggerRight.classList.add('active');
        }
      },'''

assert re.search(js_qr_pattern, html), 'js_qr_pattern not found'
html = re.sub(js_qr_pattern, js_qr_replacement, html, count=1)
print('Updated WinnerScreen JS methods')

# Save index.html
with open('index.html', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(html)
print('Saved index.html')

# Copy to sites/guess-the-frame/index.html to preserve exact SHA-256 byte parity
shutil.copy2('index.html', 'sites/guess-the-frame/index.html')
print('Copied to sites/guess-the-frame/index.html')
