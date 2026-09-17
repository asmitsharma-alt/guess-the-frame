const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(targetFile, 'utf8');

// Backup original file
fs.writeFileSync(targetFile + '.bak_pre_replication', content, 'utf8');
console.log('Backup created at index.html.bak_pre_replication');

// 1. CSS Slice
const cssStartMarker = '    .av-ambient-fg {';
const cssStartIdx = content.indexOf(cssStartMarker);
if (cssStartIdx === -1) throw new Error('cssStartMarker not found');
const avAmbientFgEnd = content.indexOf('    }', cssStartIdx) + '    }'.length;
const cssEndMarker = '    .mp-btn-primary {';
const cssEndIdx = content.indexOf(cssEndMarker, avAmbientFgEnd);
if (cssEndIdx === -1) throw new Error('cssEndMarker not found');

const newCSS = `

    /* ════ BIG BADGE MODAL BOX (EXACT REFERENCE 80VW DESKTOP / 95VW MOBILE) ════ */
    .mp-badge-modal-box {
      width: 80vw !important;
      max-width: 1180px !important;
      min-width: 320px !important;
      height: 84vh !important;
      max-height: 86vh !important;
      overflow-y: auto;
      border: 4px solid #1a1a1a;
      border-radius: 26px;
      box-shadow: 10px 10px 0 #1a1a1a;
      background: #FFFDF5;
      padding: 16px 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-sizing: border-box;
    }
    .mp-badge-modal-box .mp-btn-primary {
      margin-top: auto;
      flex-shrink: 0;
      padding: 12px 20px;
      font-size: 16px;
    }

    .mp-badge-pass-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3.5px solid #1a1a1a;
      padding-bottom: 12px;
      flex-shrink: 0;
    }
    .mp-badge-pass-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 22px;
      font-weight: 900;
      color: #1a1a1a;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }
    .mp-badge-pill-tag {
      background: #facc15;
      border: 2px solid #1a1a1a;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 900;
      padding: 2px 8px;
      box-shadow: 2px 2px 0 #1a1a1a;
      letter-spacing: 0.5px;
    }

    .mp-credentials-row {
      display: grid;
      grid-template-columns: 1fr 1.35fr;
      gap: 14px;
    }
    .mp-credentials-row-create {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 14px;
      align-items: flex-end;
    }
    .mp-credentials-row-join {
      display: grid;
      grid-template-columns: 1.1fr 1.3fr 1.3fr;
      gap: 12px;
      align-items: flex-end;
    }

    /* Avatar Picker Studio Wrap */
    .mp-avatar-picker-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      flex: 1;
      min-height: 0;
    }

    /* Inline Character Preview Badge on the SAME LINE as name input */
    .mp-inline-preview-badge {
      height: 52px !important;
      min-height: 52px !important;
      max-height: 52px !important;
      box-sizing: border-box;
      padding: 4px 12px 4px 6px !important;
      display: flex;
      align-items: center;
      gap: 10px;
      background: #ffffff;
      border: 3px solid #1a1a1a !important;
      border-radius: 12px !important;
      box-shadow: 3px 3px 0 rgba(0,0,0,0.1) !important;
      margin: 0 !important;
    }
    .mp-inline-preview-badge .mp-hero-preview-frame {
      width: 40px !important;
      height: 40px !important;
      min-width: 40px !important;
      min-height: 40px !important;
      border-radius: 9px !important;
      border: 2px solid #1a1a1a !important;
      box-shadow: 2px 2px 0 #1a1a1a !important;
      padding: 1px !important;
    }
    .mp-inline-preview-badge .mp-hero-preview-info {
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
      line-height: 1.15;
    }
    .mp-inline-preview-badge .mp-hero-char-name {
      font-size: 13px !important;
      font-weight: 900;
      color: #1a1a1a;
      text-transform: capitalize;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mp-inline-preview-badge .mp-hero-tags-row {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 1px;
    }
    .mp-inline-preview-badge .mp-hero-cat-tag {
      font-size: 10px !important;
      font-weight: 800;
      background: #facc15;
      color: #1a1a1a;
      border: 1.5px solid #1a1a1a;
      border-radius: 5px;
      padding: 1px 5px;
      white-space: nowrap;
    }
    .mp-inline-preview-badge .mp-hero-format-tag {
      font-size: 9px !important;
      font-weight: 800;
      background: #e2e8f0;
      color: #475569;
      border: 1.5px solid #1a1a1a;
      border-radius: 5px;
      padding: 1px 4px;
    }

    /* Big Hero Avatar Live Preview Badge */
    .mp-hero-preview-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #ffffff;
      border: 2.5px solid #1a1a1a;
      border-radius: 14px;
      padding: 8px 12px;
      box-shadow: 3px 3px 0 #1a1a1a;
      transition: background-color 0.2s ease;
    }
    .mp-hero-preview-frame {
      position: relative;
      width: 52px;
      height: 52px;
      aspect-ratio: 1 / 1;
      border-radius: 12px;
      border: 2.5px solid #1a1a1a;
      background: #facc15;
      box-shadow: 2px 2px 0 #1a1a1a;
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      transition: background-color 0.2s ease;
    }
    .mp-hero-preview-img {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 12px;
      pointer-events: none;
    }
    .mp-hero-check-pill {
      position: absolute;
      bottom: -2px;
      right: -2px;
      background: #10b981;
      color: #000;
      font-size: 11px;
      font-weight: 900;
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 2px solid #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mp-hero-preview-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-grow: 1;
      min-width: 0;
    }
    .mp-hero-char-name {
      font-size: 18px;
      font-weight: 900;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.3px;
    }
    .mp-hero-tags-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .mp-hero-cat-tag {
      background: #fde047;
      border: 2px solid #1a1a1a;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      box-shadow: 1.5px 1.5px 0 #1a1a1a;
      color: #1a1a1a;
    }
    .mp-hero-format-tag {
      background: #e2e8f0;
      border: 1.5px solid #1a1a1a;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      padding: 1px 6px;
      color: #475569;
    }

    /* Typo-Tolerant Search & Custom Upload Bar */
    .mp-avatar-search-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .mp-avatar-search-input-wrap {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
    }
    .mp-avatar-search-input-wrap .search-icon {
      position: absolute;
      left: 12px;
      font-size: 16px;
      pointer-events: none;
      display: flex;
      align-items: center;
    }
    .mp-avatar-search-input {
      width: 100%;
      padding: 10px 36px 10px 38px;
      border: 2.5px solid #1a1a1a;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      color: #1a1a1a;
      background: #ffffff;
      outline: none;
      box-shadow: 2.5px 2.5px 0 #1a1a1a;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .mp-avatar-search-input:focus {
      border-color: #a855f7;
      box-shadow: 3.5px 3.5px 0 #a855f7;
    }
    .mp-avatar-search-clear {
      position: absolute;
      right: 10px;
      background: #f1f5f9;
      border: 1.5px solid #1a1a1a;
      border-radius: 6px;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
    }
    .mp-avatar-search-clear:hover {
      background: #ff7eb6;
    }
    .mp-custom-upload-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #c7d2fe;
      border: 2.5px solid #1a1a1a;
      border-radius: 12px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 900;
      color: #1a1a1a;
      cursor: pointer;
      box-shadow: 2.5px 2.5px 0 #1a1a1a;
      transition: all 0.12s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .mp-custom-upload-btn:hover {
      background: #a5b4fc;
      transform: translate(-1px, -1px);
      box-shadow: 3.5px 3.5px 0 #1a1a1a;
    }
    .mp-custom-upload-btn:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0 #1a1a1a;
    }
    .mp-shuffle-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #fef08a;
      border: 2.5px solid #1a1a1a;
      border-radius: 12px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 900;
      color: #1a1a1a;
      cursor: pointer;
      box-shadow: 2.5px 2.5px 0 #1a1a1a;
      transition: all 0.12s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .mp-shuffle-btn:hover {
      background: #fde047;
      transform: translate(-1px, -1px);
      box-shadow: 3.5px 3.5px 0 #1a1a1a;
    }
    .mp-shuffle-btn:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0 #1a1a1a;
    }

    /* Category Tabs Bar */
    .mp-avatar-category-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      overflow-y: hidden;
      flex-shrink: 0;
      min-height: 46px;
      height: 46px;
      padding: 4px 4px 8px 4px;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: #1a1a1a #f1f5f9;
    }
    .mp-avatar-category-bar::-webkit-scrollbar {
      height: 4px;
    }
    .mp-avatar-category-bar::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }
    .mp-avatar-category-bar::-webkit-scrollbar-thumb {
      background: #1a1a1a;
      border-radius: 4px;
    }
    .mp-category-tab {
      background: #ffffff;
      border: 2px solid #1a1a1a;
      border-radius: 8px;
      height: 32px;
      min-height: 32px;
      max-height: 32px;
      padding: 0 12px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
      cursor: pointer;
      box-shadow: 2px 2px 0 #1a1a1a;
      transition: all 0.12s ease;
      color: #1a1a1a;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex-shrink: 0;
      box-sizing: border-box;
      user-select: none;
    }
    .mp-category-tab:hover {
      transform: translate(-1px, -1px);
      box-shadow: 3px 3px 0 #1a1a1a;
      background: #fef08a;
    }
    .mp-category-tab:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0 #1a1a1a;
    }
    .mp-category-tab.active {
      background: #facc15 !important;
      border-color: #1a1a1a !important;
      box-shadow: 2.5px 2.5px 0 #1a1a1a !important;
      font-weight: 900 !important;
    }

    /* Avatar Grid Scrollable Area */
    .mp-avatar-scroll-area {
      flex: 1;
      min-height: 280px;
      max-height: 480px;
      overflow-y: auto;
      padding-right: 6px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    @media (max-height: 750px) {
      .mp-avatar-scroll-area {
        min-height: 200px;
        max-height: 320px;
      }
    }
    .mp-avatar-scroll-area::-webkit-scrollbar {
      width: 6px;
    }
    .mp-avatar-scroll-area::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }
    .mp-avatar-scroll-area::-webkit-scrollbar-thumb {
      background: #1a1a1a;
      border-radius: 4px;
    }

    /* 100% Square Avatar Grid: 8 columns on desktop across 80% width */
    .mp-infinite-avatar-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 10px;
    }
    @media (max-width: 1100px) {
      .mp-infinite-avatar-grid {
        grid-template-columns: repeat(7, 1fr);
        gap: 8px;
      }
    }
    @media (max-width: 800px) {
      .mp-infinite-avatar-grid {
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
      }
    }
    @media (max-width: 440px) {
      .mp-infinite-avatar-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
    }

    /* 100% Square Avatar Card */
    .mp-circular-avatar-btn {
      position: relative;
      aspect-ratio: 1 / 1 !important;
      width: 100%;
      border-radius: 16px !important;
      border: 3px solid #1a1a1a;
      box-shadow: 3px 3px 0 #1a1a1a;
      cursor: pointer;
      padding: 2px;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.2s ease;
      outline: none;
      overflow: hidden;
      box-sizing: border-box;
    }
    .mp-circular-avatar-btn:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 4px 4px 0 #1a1a1a;
    }
    .mp-circular-avatar-btn:active {
      transform: scale(0.96);
    }
    .mp-circular-avatar-btn.selected {
      outline: 4px solid #facc15;
      outline-offset: 1px;
      transform: scale(1.08);
      box-shadow: 5px 5px 0 #1a1a1a;
    }

    /* Perfectly Centered Portrait Fit */
    .mp-circular-avatar-btn img.img-portrait-zoom,
    .mp-hero-preview-img.img-portrait-zoom {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 10%;
      transform: none;
      border-radius: 11px;
      pointer-events: none;
      display: block;
    }

    /* Standard Centered Cover Fit */
    .mp-circular-avatar-btn img.img-cover-zoom,
    .mp-hero-preview-img.img-cover-zoom {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
      transform: none;
      border-radius: 11px;
      pointer-events: none;
      display: block;
    }

    /* Contain Fit for Transparent Images & Vectors */
    .mp-circular-avatar-btn img.img-contain-fit,
    .mp-hero-preview-img.img-contain-fit {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      object-position: center center !important;
      transform: none !important;
      border-radius: 11px;
      pointer-events: none;
      display: block;
      padding: 4px !important;
      box-sizing: border-box !important;
    }

    .mp-avatar-item-check {
      position: absolute;
      bottom: -2px;
      right: -2px;
      background: #10b981;
      color: #000;
      font-size: 10px;
      font-weight: 900;
      width: 17px;
      height: 17px;
      border-radius: 6px;
      border: 1.5px solid #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mp-infinite-loading-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      padding: 8px 0;
      text-transform: uppercase;
    }

    /* Desktop vs Mobile visibility switching */
    @media (min-width: 769px) {
      .mp-desktop-preview-group { display: block !important; }
      .mp-mobile-trigger-group { display: none !important; }
      .mp-desktop-avatar-studio { display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
      .mp-dedicated-avatar-view { display: none !important; }
    }

    /* Mobile Modal Ergonomics & Dedicated Avatar Picker */
    @media (max-width: 768px) {
      .mp-badge-modal-box {
        width: 95vw !important;
        max-height: 92vh !important;
        height: auto !important;
        display: flex !important;
        flex-direction: column !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
        padding: 14px 14px 20px 14px !important;
        position: relative !important;
        border-radius: 16px !important;
        box-shadow: 4px 4px 0 #121212 !important;
        border-width: 3px !important;
      }

      .mp-desktop-preview-group { display: none !important; }
      .mp-mobile-trigger-group { display: block !important; }
      .mp-desktop-avatar-studio { display: none !important; }

      .mp-badge-pass-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding-bottom: 8px !important;
        border-bottom: 2.5px solid #121212 !important;
        gap: 8px !important;
        flex-shrink: 0 !important;
      }
      .mp-badge-pass-title {
        font-size: 14px !important;
        font-weight: 900 !important;
        gap: 6px !important;
        display: flex !important;
        align-items: center !important;
        flex-wrap: wrap !important;
        line-height: 1.2 !important;
        letter-spacing: 0.02em !important;
      }
      .mp-badge-pill-tag {
        font-size: 10px !important;
        font-weight: 900 !important;
        padding: 2px 6px !important;
        border: 2px solid #121212 !important;
        border-radius: 6px !important;
        box-shadow: 2px 2px 0 #121212 !important;
      }

      .mp-badge-modal-box .mp-modal-close {
        width: 36px !important;
        height: 36px !important;
        min-width: 36px !important;
        min-height: 36px !important;
        font-size: 16px !important;
        border: 2px solid #121212 !important;
        border-radius: 8px !important;
        box-shadow: 2px 2px 0 #121212 !important;
        flex-shrink: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .mp-credentials-row-create {
        grid-template-columns: 1fr !important;
        gap: 8px !important;
      }
      .mp-credentials-row-join {
        grid-template-columns: 1fr 1.2fr !important;
        gap: 8px !important;
      }
      .mp-credentials-row-join .mp-form-group:last-child {
        grid-column: span 2 !important;
      }

      .mp-mobile-avatar-trigger-card {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        background: #FFFDF0 !important;
        border: 2.5px solid #121212 !important;
        border-radius: 12px !important;
        padding: 8px 10px !important;
        box-shadow: 3px 3px 0 #121212 !important;
        cursor: pointer !important;
        margin-top: 4px !important;
        transition: transform 0.08s ease, box-shadow 0.08s ease !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      .mp-mobile-avatar-trigger-card:active {
        transform: translate(1.5px, 1.5px) !important;
        box-shadow: 1.5px 1.5px 0 #121212 !important;
      }
      .mp-mobile-avatar-trigger-card .mp-hero-preview-badge {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        background: transparent !important;
        margin: 0 !important;
        flex: 1 !important;
      }
      .mp-mobile-avatar-change-hint {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        background: #FFDE59 !important;
        color: #121212 !important;
        border: 2px solid #121212 !important;
        border-radius: 8px !important;
        padding: 6px 10px !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        box-shadow: 2px 2px 0 #121212 !important;
        flex-shrink: 0 !important;
      }

      .mp-badge-modal-box .mp-btn-primary,
      #joinRoomConfirmBtn,
      #createRoomConfirmBtn {
        position: sticky !important;
        bottom: 0 !important;
        z-index: 100 !important;
        width: 100% !important;
        margin-top: 10px !important;
        padding: 12px 18px !important;
        font-size: 15px !important;
        font-weight: 900 !important;
        letter-spacing: 0.05em !important;
        box-shadow: 4px 4px 0 #121212 !important;
      }

      /* Dedicated Mobile Avatar Flow */
      .mp-modal-box.mp-modal-box-dedicated {
        height: 90vh !important;
        max-height: 92vh !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        padding: 12px !important;
      }
      .mp-modal-box.mp-modal-box-dedicated .mp-badge-pass-header,
      .mp-modal-box.mp-modal-box-dedicated .mp-credentials-row,
      .mp-modal-box.mp-modal-box-dedicated #createRoomConfirmBtn,
      .mp-modal-box.mp-modal-box-dedicated #joinRoomConfirmBtn {
        display: none !important;
      }
      .mp-modal-box.mp-modal-box-dedicated .mp-dedicated-avatar-view {
        display: flex !important;
      }
      .mp-dedicated-avatar-view {
        display: none;
        flex-direction: column !important;
        flex: 1 !important;
        height: 100% !important;
        min-height: 0 !important;
        gap: 8px !important;
        overflow: hidden !important;
      }
      .mp-dedicated-avatar-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding-bottom: 8px !important;
        border-bottom: 2.5px solid #121212 !important;
        flex-shrink: 0 !important;
      }
      .mp-dedicated-title {
        font-size: 16px !important;
        font-weight: 900 !important;
        letter-spacing: 0.5px !important;
        color: #121212 !important;
      }
      .mp-back-btn,
      .mp-done-btn {
        height: 36px !important;
        padding: 0 12px !important;
        border: 2px solid #121212 !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        cursor: pointer !important;
        box-shadow: 2px 2px 0 #121212 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: transform 0.08s ease, box-shadow 0.08s ease !important;
      }
      .mp-back-btn {
        background: #f1f5f9 !important;
        color: #121212 !important;
      }
      .mp-done-btn {
        background: #86EFAC !important;
        color: #121212 !important;
      }
      .mp-back-btn:active,
      .mp-done-btn:active {
        transform: translate(1px, 1px) !important;
        box-shadow: 1px 1px 0 #121212 !important;
      }
      .mp-dedicated-picker-body {
        display: flex !important;
        flex-direction: column !important;
        flex: 1 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        gap: 8px !important;
      }
      .mp-dedicated-picker-body .mp-avatar-picker-wrap {
        display: flex !important;
        flex-direction: column !important;
        flex: 1 !important;
        min-height: 0 !important;
        height: 100% !important;
      }
      .mp-dedicated-picker-body .mp-avatar-scroll-area {
        max-height: none !important;
        flex: 1 !important;
        min-height: 0 !important;
        height: 100% !important;
        border: 2px solid #121212 !important;
        border-radius: 8px !important;
        padding: 6px !important;
        background: #FFFFFF !important;
      }
      .mp-dedicated-picker-body .mp-infinite-avatar-grid {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 6px !important;
      }
      .mp-dedicated-picker-body .mp-avatar-search-bar {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        width: 100% !important;
        flex-shrink: 0 !important;
      }
      .mp-dedicated-picker-body .mp-avatar-search-input-wrap {
        width: 100% !important;
        flex: 1 1 100% !important;
      }
      .mp-dedicated-picker-body .mp-avatar-search-input {
        height: 38px !important;
        font-size: 13px !important;
        padding: 8px 32px 8px 36px !important;
        border: 2px solid #121212 !important;
        border-radius: 8px !important;
        box-shadow: 2px 2px 0 #121212 !important;
      }
      .mp-dedicated-picker-body .mp-shuffle-btn,
      .mp-dedicated-picker-body .mp-custom-upload-btn {
        flex: 1 1 calc(50% - 4px) !important;
        height: 34px !important;
        min-height: 34px !important;
        padding: 0 8px !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        white-space: nowrap !important;
        border: 2px solid #121212 !important;
        border-radius: 8px !important;
        box-shadow: 2px 2px 0 #121212 !important;
        flex-shrink: 0 !important;
      }
      .mp-dedicated-picker-body .mp-avatar-category-bar {
        flex-shrink: 0 !important;
        min-height: 44px !important;
        height: 44px !important;
        padding: 3px 2px 7px 2px !important;
        margin: 2px 0 !important;
        gap: 6px !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        -webkit-overflow-scrolling: touch !important;
      }
      .mp-dedicated-picker-body .mp-category-tab {
        flex-shrink: 0 !important;
        height: 32px !important;
        min-height: 32px !important;
        padding: 0 10px !important;
        font-size: 11px !important;
        border: 2px solid #121212 !important;
        box-shadow: 2px 2px 0 #121212 !important;
      }
    }

    @media (max-width: 520px) {
      .mp-credentials-row-join {
        grid-template-columns: 1fr !important;
        gap: 8px !important;
      }
      .mp-credentials-row-join .mp-form-group:last-child {
        grid-column: span 1 !important;
      }
    }

`;

// 2. HTML Slice
const newHTML = `    <!-- CREATE ROOM MODAL (EXACT REFERENCE DESIGN) -->
    <div class="mp-modal-overlay" id="createRoomModal">
      <div class="mp-modal-box mp-badge-modal-box" id="createRoomModalBox">
        <!-- PASS HEADER STRIP -->
        <div class="mp-badge-pass-header">
          <div class="mp-badge-pass-title">
            <span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:6px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> CREATE ONLINE ROOM</span>
            <span class="mp-badge-pill-tag">HOST PASS</span>
          </div>
          <button type="button" class="mp-modal-close" onclick="MultiplayerEngine.closeModals()" aria-label="Close modal">✕</button>
        </div>

        <!-- CREDENTIALS ROW: 2 Columns on Desktop (Host Name & Character Preview) -->
        <div class="mp-credentials-row mp-credentials-row-create">
          <div class="mp-form-group" style="margin-bottom: 0;">
            <label class="mp-label">Your Host Player Name</label>
            <input type="text" id="hostPlayerNameInput" class="mp-input font-bold" placeholder="Enter your name (e.g. Maverick)" maxlength="16" oninput="AvatarStudio.updateLivePreview('host')" />
          </div>

          <!-- Desktop Character Preview Badge -->
          <div class="mp-form-group mp-desktop-preview-group" style="margin-bottom: 0;">
            <label class="mp-label">Character Preview</label>
            <div class="mp-hero-preview-badge mp-inline-preview-badge" id="hostDesktopPreviewBadge">
              <div class="mp-hero-preview-frame" id="hostDesktopPreviewFrame">
                <img src="avvtar/aman.svg" alt="Aman" class="mp-hero-preview-img img-contain-fit" id="hostDesktopPreviewImg" />
                <span class="mp-hero-check-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
              </div>
              <div class="mp-hero-preview-info">
                <div class="mp-hero-char-name" id="hostDesktopPreviewCharName">Aman</div>
                <div class="mp-hero-tags-row">
                  <span class="mp-hero-cat-tag" id="hostDesktopPreviewCatTag">Founders</span>
                  <span class="mp-hero-format-tag" id="hostDesktopPreviewFormatTag">SVG</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Mobile Character Preview Trigger Card (Tap to change) -->
          <div class="mp-form-group mp-mobile-trigger-group" style="margin-bottom: 0;">
            <label class="mp-label">Character Preview (Tap to change)</label>
            <div class="mp-mobile-avatar-trigger-card" id="createAvatarTriggerCard" onclick="AvatarStudio.openMobilePicker('host')" role="button" tabindex="0">
              <div class="mp-hero-preview-badge mp-inline-preview-badge" id="hostMobilePreviewBadge">
                <div class="mp-hero-preview-frame" id="hostMobilePreviewFrame">
                  <img src="avvtar/aman.svg" alt="Aman" class="mp-hero-preview-img img-contain-fit" id="hostMobilePreviewImg" />
                  <span class="mp-hero-check-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
                </div>
                <div class="mp-hero-preview-info">
                  <div class="mp-hero-char-name" id="hostMobilePreviewCharName">Aman</div>
                  <div class="mp-hero-tags-row">
                    <span class="mp-hero-cat-tag" id="hostMobilePreviewCatTag">Founders</span>
                    <span class="mp-hero-format-tag" id="hostMobilePreviewFormatTag">SVG</span>
                  </div>
                </div>
              </div>
              <div class="mp-mobile-avatar-change-hint">
                <span>🎨 Select</span>
                <span class="mp-arrow">➔</span>
              </div>
            </div>
          </div>
        </div>

        <!-- DESKTOP AVATAR STUDIO (Shown on Desktop, hidden on mobile) -->
        <div class="mp-desktop-avatar-studio" id="hostDesktopAvatarStudio">
          <label class="mp-label" style="margin-top: 4px; margin-bottom: 4px;">Choose Character From All Avatars</label>
          <div class="mp-avatar-picker-wrap">
            <!-- Search, Shuffle, Upload -->
            <div class="mp-avatar-search-bar">
              <div class="mp-avatar-search-input-wrap">
                <span class="search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>
                <input type="text" id="hostAvatarSearch" class="mp-avatar-search-input" placeholder="Search 1,800+ avatars (e.g. 'naroto', 'gku', 'waltr', 'batmn')..." oninput="AvatarStudio.onSearchInput(this.value, 'host')" />
                <button type="button" class="mp-avatar-search-clear" id="hostAvatarSearchClear" style="display:none;" onclick="AvatarStudio.clearSearch('host')">✕</button>
              </div>
              <button type="button" class="mp-shuffle-btn" onclick="AvatarStudio.handleReshuffle('host')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:4px;"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg> Shuffle
              </button>
              <button type="button" class="mp-custom-upload-btn" onclick="document.getElementById('hostFileInput').click()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Upload SVG / GIF
              </button>
              <input type="file" id="hostFileInput" accept=".svg,.gif,.png,.jpg,.jpeg,.webp,image/*" style="display:none;" onchange="AvatarStudio.handleFileUpload(event, 'host')" />
            </div>

            <!-- Categories -->
            <div class="mp-avatar-category-bar" id="hostCategoryBar"></div>

            <!-- Infinite Scroll Grid -->
            <div class="mp-avatar-scroll-area" id="hostAvatarScrollArea" onscroll="AvatarStudio.handleScroll(event, 'host')">
              <div class="mp-infinite-avatar-grid" id="hostAvatarGrid"></div>
              <div class="mp-infinite-loading-indicator" id="hostLoadingIndicator" style="display:none;">
                <span>⏳ Scroll for more avatars...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SUBMIT BUTTON -->
        <button id="createRoomConfirmBtn" class="mp-btn-primary" onclick="MultiplayerEngine.confirmCreateRoom()">CREATE ROOM &amp; GET CODE →</button>

        <!-- DEDICATED MOBILE AVATAR SELECTOR MENU (FULL VIEW) -->
        <div class="mp-dedicated-avatar-view" id="hostDedicatedView">
          <div class="mp-dedicated-avatar-header">
            <button type="button" class="mp-back-btn" onclick="AvatarStudio.closeMobilePicker('host')">← Back</button>
            <div class="mp-dedicated-title">CHOOSE AVATAR</div>
            <button type="button" class="mp-done-btn" onclick="AvatarStudio.closeMobilePicker('host')">
              Done <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="display:inline;vertical-align:middle;margin-left:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
          </div>
          <div class="mp-dedicated-picker-body">
            <div class="mp-avatar-picker-wrap">
              <!-- Search Bar -->
              <div class="mp-avatar-search-bar">
                <div class="mp-avatar-search-input-wrap">
                  <span class="search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>
                  <input type="text" id="hostDedicatedSearch" class="mp-avatar-search-input" placeholder="Search 1,800+ avatars (e.g. 'naroto', 'gku', 'waltr', 'batmn')..." oninput="AvatarStudio.onSearchInput(this.value, 'host', true)" />
                  <button type="button" class="mp-avatar-search-clear" id="hostDedicatedSearchClear" style="display:none;" onclick="AvatarStudio.clearSearch('host', true)">✕</button>
                </div>
                <button type="button" class="mp-shuffle-btn" onclick="AvatarStudio.handleReshuffle('host')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:4px;"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg> Shuffle
                </button>
                <button type="button" class="mp-custom-upload-btn" onclick="document.getElementById('hostFileInput').click()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Upload SVG / GIF
                </button>
              </div>
              <div class="mp-avatar-category-bar" id="hostDedicatedCategoryBar"></div>
              <div class="mp-avatar-scroll-area" id="hostDedicatedScrollArea" onscroll="AvatarStudio.handleScroll(event, 'host', true)">
                <div class="mp-infinite-avatar-grid" id="hostDedicatedAvatarGrid"></div>
                <div class="mp-infinite-loading-indicator" id="hostDedicatedLoadingIndicator" style="display:none;">
                  <span>⏳ Scroll for more avatars...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- JOIN ROOM MODAL (EXACT REFERENCE DESIGN) -->
    <div class="mp-modal-overlay" id="joinRoomModal">
      <div class="mp-modal-box mp-badge-modal-box" id="joinRoomModalBox">
        <!-- PASS HEADER STRIP -->
        <div class="mp-badge-pass-header">
          <div class="mp-badge-pass-title">
            <span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:6px;"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path></svg> ONLINE ROOM PASS</span>
            <span class="mp-badge-pill-tag">BADGE PASS</span>
          </div>
          <button type="button" class="mp-modal-close" onclick="MultiplayerEngine.closeModals()" aria-label="Close modal">✕</button>
        </div>

        <!-- CREDENTIALS ROW: 3 Columns on Desktop (Code, Name, Character Preview) -->
        <div class="mp-credentials-row mp-credentials-row-join">
          <!-- 1. Room Code -->
          <div class="mp-form-group" style="margin-bottom: 0;">
            <label class="mp-label">4-Letter Room Code</label>
            <input type="text" id="joinCodeInput" class="mp-input mp-code-input" placeholder="FILM" maxlength="6" />
          </div>

          <!-- 2. Player Name -->
          <div class="mp-form-group" style="margin-bottom: 0;">
            <label class="mp-label">Your Player Name</label>
            <input type="text" id="joinPlayerNameInput" class="mp-input font-bold" placeholder="Enter your name (e.g. Neo)" maxlength="16" oninput="AvatarStudio.updateLivePreview('join')" />
          </div>

          <!-- Desktop Character Preview Badge -->
          <div class="mp-form-group mp-desktop-preview-group" style="margin-bottom: 0;">
            <label class="mp-label">Character Preview</label>
            <div class="mp-hero-preview-badge mp-inline-preview-badge" id="joinDesktopPreviewBadge">
              <div class="mp-hero-preview-frame" id="joinDesktopPreviewFrame">
                <img src="avvtar/aman.svg" alt="Aman" class="mp-hero-preview-img img-contain-fit" id="joinDesktopPreviewImg" />
                <span class="mp-hero-check-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
              </div>
              <div class="mp-hero-preview-info">
                <div class="mp-hero-char-name" id="joinDesktopPreviewCharName">Aman</div>
                <div class="mp-hero-tags-row">
                  <span class="mp-hero-cat-tag" id="joinDesktopPreviewCatTag">Founders</span>
                  <span class="mp-hero-format-tag" id="joinDesktopPreviewFormatTag">SVG</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Mobile Character Preview Trigger Card (Tap to change) -->
          <div class="mp-form-group mp-mobile-trigger-group" style="margin-bottom: 0;">
            <label class="mp-label">Player Avatar (Tap to change)</label>
            <div class="mp-mobile-avatar-trigger-card" id="joinAvatarTriggerCard" onclick="AvatarStudio.openMobilePicker('join')" role="button" tabindex="0">
              <div class="mp-hero-preview-badge mp-inline-preview-badge" id="joinMobilePreviewBadge">
                <div class="mp-hero-preview-frame" id="joinMobilePreviewFrame">
                  <img src="avvtar/aman.svg" alt="Aman" class="mp-hero-preview-img img-contain-fit" id="joinMobilePreviewImg" />
                  <span class="mp-hero-check-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
                </div>
                <div class="mp-hero-preview-info">
                  <div class="mp-hero-char-name" id="joinMobilePreviewCharName">Aman</div>
                  <div class="mp-hero-tags-row">
                    <span class="mp-hero-cat-tag" id="joinMobilePreviewCatTag">Founders</span>
                    <span class="mp-hero-format-tag" id="joinMobilePreviewFormatTag">SVG</span>
                  </div>
                </div>
              </div>
              <div class="mp-mobile-avatar-change-hint">
                <span>🎨 Select</span>
                <span class="mp-arrow">➔</span>
              </div>
            </div>
          </div>
        </div>

        <!-- DESKTOP AVATAR STUDIO (Shown on Desktop, hidden on mobile) -->
        <div class="mp-desktop-avatar-studio" id="joinDesktopAvatarStudio">
          <label class="mp-label" style="margin-top: 4px; margin-bottom: 4px;">Choose Character From All Avatars</label>
          <div class="mp-avatar-picker-wrap">
            <!-- Search, Shuffle, Upload -->
            <div class="mp-avatar-search-bar">
              <div class="mp-avatar-search-input-wrap">
                <span class="search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>
                <input type="text" id="joinAvatarSearch" class="mp-avatar-search-input" placeholder="Search 1,800+ avatars (e.g. 'naroto', 'gku', 'waltr', 'batmn')..." oninput="AvatarStudio.onSearchInput(this.value, 'join')" />
                <button type="button" class="mp-avatar-search-clear" id="joinAvatarSearchClear" style="display:none;" onclick="AvatarStudio.clearSearch('join')">✕</button>
              </div>
              <button type="button" class="mp-shuffle-btn" onclick="AvatarStudio.handleReshuffle('join')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:4px;"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg> Shuffle
              </button>
              <button type="button" class="mp-custom-upload-btn" onclick="document.getElementById('joinFileInput').click()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Upload SVG / GIF
              </button>
              <input type="file" id="joinFileInput" accept=".svg,.gif,.png,.jpg,.jpeg,.webp,image/*" style="display:none;" onchange="AvatarStudio.handleFileUpload(event, 'join')" />
            </div>

            <!-- Categories -->
            <div class="mp-avatar-category-bar" id="joinCategoryBar"></div>

            <!-- Infinite Scroll Grid -->
            <div class="mp-avatar-scroll-area" id="joinAvatarScrollArea" onscroll="AvatarStudio.handleScroll(event, 'join')">
              <div class="mp-infinite-avatar-grid" id="joinAvatarGrid"></div>
              <div class="mp-infinite-loading-indicator" id="joinLoadingIndicator" style="display:none;">
                <span>⏳ Scroll for more avatars...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SUBMIT BUTTON -->
        <button id="joinRoomConfirmBtn" class="mp-btn-primary" onclick="MultiplayerEngine.confirmJoinRoom()">ENTER ROOM →</button>

        <!-- DEDICATED MOBILE AVATAR SELECTOR MENU (FULL VIEW) -->
        <div class="mp-dedicated-avatar-view" id="joinDedicatedView">
          <div class="mp-dedicated-avatar-header">
            <button type="button" class="mp-back-btn" onclick="AvatarStudio.closeMobilePicker('join')">← Back</button>
            <div class="mp-dedicated-title">CHOOSE AVATAR</div>
            <button type="button" class="mp-done-btn" onclick="AvatarStudio.closeMobilePicker('join')">
              Done <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="display:inline;vertical-align:middle;margin-left:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
          </div>
          <div class="mp-dedicated-picker-body">
            <div class="mp-avatar-picker-wrap">
              <!-- Search Bar -->
              <div class="mp-avatar-search-bar">
                <div class="mp-avatar-search-input-wrap">
                  <span class="search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>
                  <input type="text" id="joinDedicatedSearch" class="mp-avatar-search-input" placeholder="Search 1,800+ avatars (e.g. 'naroto', 'gku', 'waltr', 'batmn')..." oninput="AvatarStudio.onSearchInput(this.value, 'join', true)" />
                  <button type="button" class="mp-avatar-search-clear" id="joinDedicatedSearchClear" style="display:none;" onclick="AvatarStudio.clearSearch('join', true)">✕</button>
                </div>
                <button type="button" class="mp-shuffle-btn" onclick="AvatarStudio.handleReshuffle('join')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:4px;"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg> Shuffle
                </button>
                <button type="button" class="mp-custom-upload-btn" onclick="document.getElementById('joinFileInput').click()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Upload SVG / GIF
                </button>
              </div>
              <div class="mp-avatar-category-bar" id="joinDedicatedCategoryBar"></div>
              <div class="mp-avatar-scroll-area" id="joinDedicatedScrollArea" onscroll="AvatarStudio.handleScroll(event, 'join', true)">
                <div class="mp-infinite-avatar-grid" id="joinDedicatedAvatarGrid"></div>
                <div class="mp-infinite-loading-indicator" id="joinDedicatedLoadingIndicator" style="display:none;">
                  <span>⏳ Scroll for more avatars...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>\n\n`;

// 3. Script Slice: New AvatarStudio Controller
const newScript = `    const AvatarStudio = {
      state: {
        host: { cat: 'all', search: '', selectedId: 'aman', loadedCount: 48, customAvatar: null, detectedBgColors: {}, detectedTransparent: {} },
        join: { cat: 'all', search: '', selectedId: 'aman', loadedCount: 48, customAvatar: null, detectedBgColors: {}, detectedTransparent: {} }
      },
      catEmojis: {
        'all': '✨', 'movies': '🎬', 'star-wars': '⚔️', 'harry-potter': '🪄', 'lord-of-the-rings': '💍',
        'superheroes': '⚡', 'dc-comics': '🦇', 'spider-verse': '🕷️', 'disney': '🏰', 'dreamworks': '🌙',
        'cartoons': '📺', 'cartoon-network': '📺', 'ben-10': '🤖', 'teen-titans': '🔥', 'adventure-time': '🧭',
        'gravity-falls': '🌲', 'steven-universe': '💎', 'spongebob': '🌊', 'the-simpsons': '🍩', 'south-park': '🏔️',
        'futurama': '🚀', 'rick-morty': '🧪', 'invincible': '🛡️', 'avatar-airbender': '💨', 'tv-series': '🎥',
        'breaking-bad': '⚗️', 'better-call-saul': '⚖️', 'game-of-thrones': '👑', 'house-of-dragon': '🐉', 'the-boys': '💀',
        'stranger-things': '📻', 'the-office': '💼', 'friends': '☕', 'peaky-blinders': '👓', 'the-witcher': '🐺',
        'the-walking-dead': '🧟', 'supernatural': '✝️', 'house-md': '🩺', 'anime': '⚡', 'doraemon': '🔔',
        'naruto': '🍥', 'one-piece': '⚓', 'dragon-ball': '☄️', 'attack-on-titan': '⚔️', 'jujutsu-kaisen': '👁️',
        'demon-slayer': '🗡️', 'death-note': '📓', 'bleach': '✨', 'hunter-x-hunter': '🎯', 'fullmetal-alchemist': '🦾',
        'chainsaw-man': '🪚', 'spy-x-family': '🕵️', 'my-hero-academia': '💥', 'jojo': '⭐', 'cyberpunk-edgerunners': '💻',
        'pokemon': '⚡', 'yugioh': '🃏', 'digimon': '👾', 'other': '🎮', 'arcane-league': '🏹',
        'overwatch': '🛡️', 'genshin': '🌸', 'minecraft': '⛏️', 'founders': '👑', 'custom': '📤'
      },

      init(modalType) {
        if (!this.state[modalType]) return;
        const currentAv = (typeof MultiplayerEngine !== 'undefined' && MultiplayerEngine.playerAvatar) ? MultiplayerEngine.playerAvatar : (localStorage.getItem('gtf_player_avatar') || 'aman');
        this.state[modalType].selectedId = currentAv;
        this.state[modalType].loadedCount = 48;
        if (typeof window.reshuffleAllAvatars === 'function') {
          try { window.reshuffleAllAvatars(); } catch(e) {}
        }
        this.closeMobilePicker(modalType);
        this.renderCategories(modalType);
        this.renderGrid(modalType);
        this.updateLivePreview(modalType);
      },

      openMobilePicker(modalType) {
        if (typeof SoundManager !== 'undefined' && SoundManager.playClick) SoundManager.playClick();
        const box = document.getElementById(modalType === 'host' ? 'createRoomModalBox' : 'joinRoomModalBox');
        if (box) box.classList.add('mp-modal-box-dedicated');
        this.renderCategories(modalType, true);
        this.renderGrid(modalType, true);
        // Sync search input
        const mainSearch = document.getElementById(modalType === 'host' ? 'hostAvatarSearch' : 'joinAvatarSearch');
        const dedSearch = document.getElementById(modalType === 'host' ? 'hostDedicatedSearch' : 'joinDedicatedSearch');
        if (mainSearch && dedSearch) dedSearch.value = mainSearch.value;
        const scrollArea = document.getElementById(modalType === 'host' ? 'hostDedicatedScrollArea' : 'joinDedicatedScrollArea');
        if (scrollArea) scrollArea.scrollTop = 0;
      },

      closeMobilePicker(modalType) {
        if (typeof SoundManager !== 'undefined' && SoundManager.playClick) SoundManager.playClick();
        const box = document.getElementById(modalType === 'host' ? 'createRoomModalBox' : 'joinRoomModalBox');
        if (box) box.classList.remove('mp-modal-box-dedicated');
        this.updateLivePreview(modalType);
      },

      cleanCategoryLabel(label) {
        return label ? label.replace(/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{2702}-\\u{27B0}\\u{2B50}\\u{26A1}\\u{2694}\\u{2B55}\\u{FE0F}]/gu, '').trim() : '';
      },

      renderCategories(modalType, isDedicated = false) {
        const barId = isDedicated
          ? (modalType === 'host' ? 'hostDedicatedCategoryBar' : 'joinDedicatedCategoryBar')
          : (modalType === 'host' ? 'hostCategoryBar' : 'joinCategoryBar');
        const bar = document.getElementById(barId);
        if (!bar) return;

        const cats = (typeof window.AVATAR_CATEGORIES !== 'undefined') ? window.AVATAR_CATEGORIES : (typeof AvatarCatalog !== 'undefined' ? AvatarCatalog.getCategories() : []);
        const curCat = this.state[modalType].cat;

        bar.innerHTML = cats.map(cat => {
          const emoji = this.catEmojis[cat.id] || '✨';
          const cleanLabel = this.cleanCategoryLabel(cat.label || cat.id);
          const isActive = cat.id === curCat;
          return \`
            <button type="button" class="mp-category-tab \${isActive ? 'active' : ''}" onclick="AvatarStudio.setCategory('\${cat.id}', '\${modalType}', \${isDedicated})">
              <span>\${emoji}</span>
              <span>\${cleanLabel}</span>
            </button>
          \`;
        }).join('');
      },

      setCategory(catId, modalType, isDedicated = false) {
        if (typeof SoundManager !== 'undefined' && SoundManager.playClick) SoundManager.playClick();
        this.state[modalType].cat = catId;
        this.state[modalType].loadedCount = 48;
        this.renderCategories(modalType, false);
        this.renderCategories(modalType, true);
        this.renderGrid(modalType, false);
        this.renderGrid(modalType, true);
        const scrollArea = document.getElementById(
          isDedicated
            ? (modalType === 'host' ? 'hostDedicatedScrollArea' : 'joinDedicatedScrollArea')
            : (modalType === 'host' ? 'hostAvatarScrollArea' : 'joinAvatarScrollArea')
        );
        if (scrollArea) scrollArea.scrollTop = 0;
      },

      onSearchInput(query, modalType, isDedicated = false) {
        this.state[modalType].search = query;
        this.state[modalType].loadedCount = 48;

        // Keep both desktop and dedicated search inputs in sync
        const mainInput = document.getElementById(modalType === 'host' ? 'hostAvatarSearch' : 'joinAvatarSearch');
        const dedInput = document.getElementById(modalType === 'host' ? 'hostDedicatedSearch' : 'joinDedicatedSearch');
        if (isDedicated && mainInput) mainInput.value = query;
        if (!isDedicated && dedInput) dedInput.value = query;

        const mainClear = document.getElementById(modalType === 'host' ? 'hostAvatarSearchClear' : 'joinAvatarSearchClear');
        const dedClear = document.getElementById(modalType === 'host' ? 'hostDedicatedSearchClear' : 'joinDedicatedSearchClear');
        if (mainClear) mainClear.style.display = query ? 'flex' : 'none';
        if (dedClear) dedClear.style.display = query ? 'flex' : 'none';

        this.renderGrid(modalType, false);
        this.renderGrid(modalType, true);
      },

      clearSearch(modalType, isDedicated = false) {
        this.onSearchInput('', modalType, isDedicated);
        const mainInput = document.getElementById(modalType === 'host' ? 'hostAvatarSearch' : 'joinAvatarSearch');
        const dedInput = document.getElementById(modalType === 'host' ? 'hostDedicatedSearch' : 'joinDedicatedSearch');
        if (mainInput) mainInput.value = '';
        if (dedInput) dedInput.value = '';
      },

      handleReshuffle(modalType) {
        if (typeof SoundManager !== 'undefined' && SoundManager.playClick) SoundManager.playClick();
        if (typeof window.reshuffleAllAvatars === 'function') {
          try { window.reshuffleAllAvatars(); } catch(e) {}
        }
        this.state[modalType].loadedCount = 48;
        this.renderGrid(modalType, false);
        this.renderGrid(modalType, true);
      },

      handleFileUpload(e, modalType) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.size > 2.5 * 1024 * 1024) {
          alert('Avatar file is too large! Please choose an SVG, GIF, or image under 2.5 MB.');
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target && event.target.result;
          if (typeof dataUrl === 'string') {
            const isSvg = file.type.includes('svg') || file.name.endsWith('.svg');
            const isGif = file.type.includes('gif') || file.name.endsWith('.gif');
            const customObj = {
              id: 'custom_upload_' + Date.now(),
              name: file.name.replace(/\\.[^/.]+$/, ''),
              category: 'custom',
              categoryLabel: 'Custom Upload',
              url: dataUrl,
              src: dataUrl,
              format: isSvg ? 'SVG' : (isGif ? 'GIF' : 'IMG'),
              color: '38bdf8',
              isKnownDark: false,
              isKnownPortrait: false,
              isVector: isSvg,
              isTransparent: isSvg
            };
            this.state[modalType].customAvatar = customObj;
            this.selectAvatar(dataUrl, modalType);
            this.closeMobilePicker(modalType);
          }
        };
        reader.readAsDataURL(file);
        if (e.target) e.target.value = '';
      },

      handleScroll(e, modalType, isDedicated = false) {
        const el = e.target;
        if (!el) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) {
          this.state[modalType].loadedCount += 32;
          this.renderGrid(modalType, isDedicated);
        }
      },

      renderGrid(modalType, isDedicated = false) {
        const gridId = isDedicated
          ? (modalType === 'host' ? 'hostDedicatedAvatarGrid' : 'joinDedicatedAvatarGrid')
          : (modalType === 'host' ? 'hostAvatarGrid' : 'joinAvatarGrid');
        const grid = document.getElementById(gridId);
        if (!grid) return;

        const s = this.state[modalType];
        let list = [];
        if (s.search.trim()) {
          const q = s.search.trim();
          if (typeof window.searchAvatars === 'function') {
            list = window.searchAvatars(q, s.cat);
            if (list.length === 0 && s.cat !== 'all') {
              list = window.searchAvatars(q, 'all');
            }
          }
        } else {
          if (typeof window.getAvatarsByCategory === 'function') {
            list = window.getAvatarsByCategory(s.cat);
          }
        }

        if (s.customAvatar && (s.cat === 'all' || s.cat === 'custom')) {
          list = [s.customAvatar, ...list.filter(x => x.url !== s.customAvatar.url)];
        }

        const displayed = list.slice(0, s.loadedCount);

        if (displayed.length === 0) {
          grid.innerHTML = \`
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 16px; color: #718096;">
              <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
              <div style="font-size: 15px; font-weight: 800; color: #1a1a1a;">No avatars found for "\${SecurityUtil.escapeHtml(s.search)}"</div>
              <div style="font-size: 12px; margin-top: 4px;">Try searching for Pikachu, Goku, Batman, Rick, or Aman</div>
            </div>
          \`;
          return;
        }

        const cardsHtml = displayed.map(item => {
          const itemUrl = item.url || item.src || '';
          const isSelected = (s.selectedId === itemUrl) || (item.id && s.selectedId === item.id);
          const detectedColor = s.detectedBgColors[itemUrl];
          const cardBg = detectedColor || (item.isKnownDark ? '#111827' : ('#' + (item.color || 'ffffff').replace('#', '')));
          const isTransparent = typeof window.isAvatarTransparent === 'function' ? window.isAvatarTransparent(item, s.detectedTransparent) : (item.isTransparent || item.isVector || itemUrl.endsWith('.svg'));
          const zoomClass = isTransparent ? 'img-contain-fit' : (item.isKnownPortrait ? 'img-portrait-zoom' : 'img-cover-zoom');
          const safeName = SecurityUtil.escapeHtml(item.name || 'Avatar');
          const safeCat = SecurityUtil.escapeHtml(item.categoryLabel || item.category || '');

          return \`
            <button type="button" class="mp-circular-avatar-btn \${isSelected ? 'selected' : ''}" style="background-color: \${cardBg};" onclick="AvatarStudio.selectAvatar('\${itemUrl.replace(/'/g, "\\\\'")}', '\${modalType}', \${isDedicated})" title="\${safeName} (\${safeCat})">
              <img src="\${itemUrl}" alt="\${safeName}" loading="lazy" decoding="async" class="\${zoomClass}" onerror="AvatarStudio.handleImageError(this, '\${safeName}', '\${item.color || 'facc15'}')" onload="AvatarStudio.handleImageLoad(this, '\${itemUrl.replace(/'/g, "\\\\'")}', \${!!item.isKnownDark})" />
              \${isSelected ? '<span class="mp-avatar-item-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>' : ''}
            </button>
          \`;
        }).join('');

        grid.innerHTML = cardsHtml;

        const loaderId = isDedicated
          ? (modalType === 'host' ? 'hostDedicatedLoadingIndicator' : 'joinDedicatedLoadingIndicator')
          : (modalType === 'host' ? 'hostLoadingIndicator' : 'joinLoadingIndicator');
        const loader = document.getElementById(loaderId);
        if (loader) {
          loader.style.display = list.length > s.loadedCount ? 'flex' : 'none';
        }
      },

      handleImageError(img, name, color) {
        img.onerror = null;
        const cleanColor = String(color || 'facc15').replace('#', '');
        img.src = 'https://api.dicebear.com/9.x/bottts/svg?seed=' + encodeURIComponent(name) + '&backgroundColor=' + cleanColor;
        img.className = 'img-contain-fit';
      },

      handleImageLoad(img, itemUrl, isKnownDark) {
        if (!img) return;
        if (isKnownDark) return;
        if (itemUrl.endsWith('.svg') || itemUrl.includes('/avvtar/')) return;
        try {
          if (img.naturalWidth > 10 && img.naturalHeight > 10) {
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, 16, 16);
            const data = ctx.getImageData(0, 0, 16, 16).data;
            const tl = { r: data[0], g: data[1], b: data[2], a: data[3] };
            const tr = { r: data[60], g: data[61], b: data[62], a: data[63] };
            const bl = { r: data[960], g: data[961], b: data[962], a: data[963] };
            const br = { r: data[1020], g: data[1021], b: data[1022], a: data[1023] };
            if (tl.a < 180 || tr.a < 180 || bl.a < 180 || br.a < 180) {
              return;
            }
            if (tl.a > 30 && tr.a > 30) {
              const diff = Math.abs(tl.r - tr.r) + Math.abs(tl.g - tr.g) + Math.abs(tl.b - tr.b);
              if (diff < 35) {
                const hex = '#' + ((1 << 24) + (tl.r << 16) + (tl.g << 8) + tl.b).toString(16).slice(1);
                img.parentElement.style.backgroundColor = hex;
              }
            }
          }
        } catch(e) {}
      },

      selectAvatar(urlOrId, modalType, isDedicated = false) {
        if (typeof SoundManager !== 'undefined' && SoundManager.playClick) SoundManager.playClick();
        this.state[modalType].selectedId = urlOrId;

        if (typeof MultiplayerEngine !== 'undefined') {
          MultiplayerEngine.selectedAvatarForModal = urlOrId;
          MultiplayerEngine.playerAvatar = urlOrId;
          try {
            localStorage.setItem('gtf_player_avatar', urlOrId);
          } catch(e) {}
        }

        // Update default name if empty or generic
        const nameInput = modalType === 'host' ? document.getElementById('hostPlayerNameInput') : document.getElementById('joinPlayerNameInput');
        const meta = typeof window.getAvatarMeta === 'function' ? window.getAvatarMeta(urlOrId) : null;
        if (nameInput && meta) {
          const curVal = nameInput.value.trim();
          const genericNames = ['Player', 'Guest', 'Aman', 'Amish', 'Aziz', 'Vish', 'Nolan', 'Maverick', 'Neo'];
          if (!curVal || genericNames.includes(curVal)) {
            nameInput.value = meta.name || 'Player';
            if (typeof MultiplayerEngine !== 'undefined') MultiplayerEngine.playerName = nameInput.value;
          }
        }

        // Re-render both grids to update selected checkmark
        this.renderGrid(modalType, false);
        this.renderGrid(modalType, true);
        this.updateLivePreview(modalType);

        // If in mobile dedicated view, close and return to main form view
        if (isDedicated) {
          this.closeMobilePicker(modalType);
        }
      },

      updateLivePreview(modalType) {
        const s = this.state[modalType];
        let meta;
        if (s.customAvatar && s.selectedId === s.customAvatar.url) {
          meta = s.customAvatar;
        } else if (typeof window.getAvatarMeta === 'function') {
          meta = window.getAvatarMeta(s.selectedId);
        } else {
          meta = { name: 'Player', categoryLabel: 'Founders', url: 'avvtar/aman.svg', format: 'SVG', color: 'facc15' };
        }

        const previewSrc = (typeof window.getAvatarSrc === 'function') ? window.getAvatarSrc(meta.url || s.selectedId, 'aman') : (meta.url || 'avvtar/aman.svg');
        const previewBg = meta.isKnownDark ? '#111827' : ('#' + (meta.color || 'facc15').replace('#', ''));
        const isTransparent = typeof window.isAvatarTransparent === 'function' ? window.isAvatarTransparent(meta, s.detectedTransparent) : (meta.isTransparent || meta.isVector || previewSrc.endsWith('.svg'));
        const previewZoom = isTransparent ? 'img-contain-fit' : (meta.isKnownPortrait ? 'img-portrait-zoom' : 'img-cover-zoom');

        const prefix = modalType === 'host' ? 'host' : 'join';

        // Desktop Preview
        const dFrame = document.getElementById(prefix + 'DesktopPreviewFrame');
        const dImg = document.getElementById(prefix + 'DesktopPreviewImg');
        const dName = document.getElementById(prefix + 'DesktopPreviewCharName');
        const dCat = document.getElementById(prefix + 'DesktopPreviewCatTag');
        const dFmt = document.getElementById(prefix + 'DesktopPreviewFormatTag');

        if (dFrame) dFrame.style.backgroundColor = previewBg;
        if (dImg) {
          dImg.src = previewSrc;
          dImg.alt = meta.name || 'Avatar';
          dImg.className = 'mp-hero-preview-img ' + previewZoom;
        }
        if (dName) dName.textContent = meta.name || 'Selected Avatar';
        if (dCat) dCat.textContent = this.cleanCategoryLabel(meta.categoryLabel || meta.category || 'Founders');
        if (dFmt) dFmt.textContent = meta.format || (previewSrc.endsWith('.svg') ? 'SVG' : 'IMG');

        // Mobile Preview Trigger Card
        const mFrame = document.getElementById(prefix + 'MobilePreviewFrame');
        const mImg = document.getElementById(prefix + 'MobilePreviewImg');
        const mName = document.getElementById(prefix + 'MobilePreviewCharName');
        const mCat = document.getElementById(prefix + 'MobilePreviewCatTag');
        const mFmt = document.getElementById(prefix + 'MobilePreviewFormatTag');

        if (mFrame) mFrame.style.backgroundColor = previewBg;
        if (mImg) {
          mImg.src = previewSrc;
          mImg.alt = meta.name || 'Avatar';
          mImg.className = 'mp-hero-preview-img ' + previewZoom;
        }
        if (mName) mName.textContent = meta.name || 'Selected Avatar';
        if (mCat) mCat.textContent = this.cleanCategoryLabel(meta.categoryLabel || meta.category || 'Founders');
        if (mFmt) mFmt.textContent = meta.format || (previewSrc.endsWith('.svg') ? 'SVG' : 'IMG');
      }
    };
    window.AvatarStudio = AvatarStudio;

    // Hook into MultiplayerEngine to ensure getAvatarDisplayName and avatar resolution work across all 1,827 avatars
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof MultiplayerEngine !== 'undefined') {
        const origGetAvatarDisplayName = MultiplayerEngine.getAvatarDisplayName;
        MultiplayerEngine.getAvatarDisplayName = function(av) {
          if (typeof window.getAvatarMeta === 'function') {
            const meta = window.getAvatarMeta(av);
            if (meta && meta.name) return meta.name;
          }
          if (typeof AvatarCatalog !== 'undefined' && AvatarCatalog.getById) {
            const item = AvatarCatalog.getById(av);
            if (item && item.name) return item.name;
          }
          return origGetAvatarDisplayName ? origGetAvatarDisplayName.call(this, av) : 'Player';
        };

        const origConfirmCreateRoom = MultiplayerEngine.confirmCreateRoom;
        MultiplayerEngine.confirmCreateRoom = function() {
          this.playerAvatar = this.selectedAvatarForModal || this.playerAvatar || 'aman';
          const meta = (typeof window.getAvatarMeta === 'function') ? window.getAvatarMeta(this.playerAvatar) : null;
          this.playerAvatarImg = (meta && meta.url) ? meta.url : ((this.playerAvatar.includes('/') || this.playerAvatar.startsWith('data:')) ? this.playerAvatar : \`avvtar/\${this.playerAvatar}.svg\`);
          return origConfirmCreateRoom.apply(this, arguments);
        };

        const origConfirmJoinRoom = MultiplayerEngine.confirmJoinRoom;
        MultiplayerEngine.confirmJoinRoom = function() {
          this.playerAvatar = this.selectedAvatarForModal || this.playerAvatar || 'aman';
          const meta = (typeof window.getAvatarMeta === 'function') ? window.getAvatarMeta(this.playerAvatar) : null;
          this.playerAvatarImg = (meta && meta.url) ? meta.url : ((this.playerAvatar.includes('/') || this.playerAvatar.startsWith('data:')) ? this.playerAvatar : \`avvtar/\${this.playerAvatar}.svg\`);
          return origConfirmJoinRoom.apply(this, arguments);
        };
      }
    });

`;

// Perform replacements sequentially from end of file to start to prevent offset shifts
console.log('Calculating Script slice...');
const scriptStartMarker = '    const AvatarStudio = {';
const scriptEndMarker = '    const MultiplayerEngine = {';
const scriptStartIdx = content.indexOf(scriptStartMarker);
const scriptEndIdx = content.indexOf(scriptEndMarker, scriptStartIdx);
if (scriptStartIdx === -1 || scriptEndIdx === -1) throw new Error('Script markers not found');

console.log('Replacing Script slice...');
content = content.slice(0, scriptStartIdx) + newScript + content.slice(scriptEndIdx);

console.log('Recalculating HTML slice...');
const newHtmlStartIdx = content.indexOf('    <!-- CREATE ROOM MODAL (90% WIDESCREEN LOBBY STUDIO) -->');
const newHtmlEndIdx = content.indexOf('    <!-- REJOIN ROOM MODAL', newHtmlStartIdx);
if (newHtmlStartIdx === -1 || newHtmlEndIdx === -1) throw new Error('HTML markers not found after script replacement');

console.log('Replacing HTML slice...');
content = content.slice(0, newHtmlStartIdx) + newHTML + content.slice(newHtmlEndIdx);

console.log('Recalculating CSS slice...');
const newCssStartIdx = content.indexOf('    .av-ambient-fg {');
const newAvAmbientFgEnd = content.indexOf('    }', newCssStartIdx) + '    }'.length;
const newCssEndIdx = content.indexOf('    .mp-btn-primary {', newAvAmbientFgEnd);
if (newCssStartIdx === -1 || newCssEndIdx === -1) throw new Error('CSS markers not found after HTML replacement');

console.log('Replacing CSS slice...');
content = content.slice(0, newAvAmbientFgEnd) + newCSS + content.slice(newCssEndIdx);

// Also verify MultiplayerEngine.confirmCreateRoom and confirmJoinRoom handle URL / ID avatar resolution properly
console.log('Verifying confirmCreateRoom and confirmJoinRoom...');
const confirmCreateMarker = 'confirmCreateRoom() {';
const ccIdx = content.indexOf(confirmCreateMarker);
if (ccIdx !== -1) {
  // Replace the avatar resolution in confirmCreateRoom
  const ccSnippet = content.slice(ccIdx, ccIdx + 500);
  console.log('confirmCreateRoom snippet:', ccSnippet.slice(0, 150));
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully updated index.html! New length:', content.length);
