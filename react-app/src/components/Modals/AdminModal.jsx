import React, { useState } from 'react';
import SoundManager from '../../services/soundManager';

export const AdminModal = ({ isOpen, onClose, onPreviewWinner }) => {
  const [activeTab, setActiveTab] = useState('settings');
  const [timer, setTimer] = useState(20);
  const [judgeTimer, setJudgeTimer] = useState(5);
  const [reveal, setReveal] = useState(2);
  const [pts, setPts] = useState(10);
  const [jPts, setJPts] = useState(20);
  const [volume, setVolume] = useState(70);
  const [creatorMsg, setCreatorMsg] = useState('tanmay, Tanuj, Darshan, Akash, Anmol (timestamp guy) and members of smoc.');

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} id="adminModal" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle" style={{ display: isOpen ? 'flex' : 'none' }}>
      <div className="modal-content" style={{ position: 'relative' }}>
        <div className="modal-header">
          <h2 id="adminModalTitle">
            <svg className="svg-icon"><use href="#icon-settings" /></svg> Admin Panel
          </h2>
          <button className="close-btn" onClick={onClose} aria-label="Close admin panel">×</button>
        </div>

        <div className="admin-tabs" role="tablist">
          <button
            className={`admin-tab ${activeTab === 'sections' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'sections'}
            onClick={() => setActiveTab('sections')}
          >
            <svg className="svg-icon"><use href="#icon-folder" /></svg> Sections
          </button>
          <button
            className={`admin-tab ${activeTab === 'players' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'players'}
            onClick={() => setActiveTab('players')}
          >
            <svg className="svg-icon"><use href="#icon-users" /></svg> Players
          </button>
          <button
            className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          >
            <svg className="svg-icon"><use href="#icon-settings" /></svg> Settings
          </button>
          <button
            className={`admin-tab ${activeTab === 'sounds' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'sounds'}
            onClick={() => setActiveTab('sounds')}
          >
            <svg className="svg-icon"><use href="#icon-volume-2" /></svg> Sounds
          </button>
        </div>

        {activeTab === 'settings' && (
          <div className="admin-tab-content active" id="tab-settings">
            <div className="admin-grid">
              <div className="admin-section">
                <h3>⏱ Timer</h3>
                <div className="input-group">
                  <label>Round Duration (s)</label>
                  <input type="number" id="cfgTimer" value={timer} min="5" max="120" onChange={(e) => setTimer(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label>Judge Phase (s)</label>
                  <input type="number" id="cfgJudgeTimer" value={judgeTimer} min="3" max="15" onChange={(e) => setJudgeTimer(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label>Answer Reveal (s)</label>
                  <input type="number" id="cfgReveal" value={reveal} min="1" max="10" onChange={(e) => setReveal(Number(e.target.value))} />
                </div>
              </div>

              <div className="admin-section">
                <h3><svg className="svg-icon"><use href="#icon-target" /></svg> Points</h3>
                <div className="input-group">
                  <label>Correct Answer</label>
                  <input type="number" id="cfgPts" value={pts} min="1" max="100" onChange={(e) => setPts(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label>Judge Bonus</label>
                  <input type="number" id="cfgJPts" value={jPts} min="1" max="100" onChange={(e) => setJPts(Number(e.target.value))} />
                </div>
              </div>

              <div className="admin-section full-width">
                <h3><svg className="svg-icon"><use href="#icon-image" /></svg> Frames By</h3>
                <div className="input-group">
                  <textarea id="cfgMsg" placeholder="Enter names..." value={creatorMsg} onChange={(e) => setCreatorMsg(e.target.value)} />
                </div>
              </div>

              <div className="admin-section full-width">
                <h3><svg className="svg-icon"><use href="#icon-volume-2" /></svg> Volume</h3>
                <div className="input-group">
                  <label>Master Volume</label>
                  <input
                    type="range"
                    id="cfgVol"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      SoundManager.setVolume(Number(e.target.value) / 100);
                    }}
                  />
                </div>
              </div>

              <div className="admin-section full-width">
                <h3><svg className="svg-icon"><use href="#icon-trophy" /></svg> Preview</h3>
                <button
                  className="preview-winner-btn"
                  onClick={() => {
                    if (typeof onPreviewWinner === 'function') onPreviewWinner();
                    onClose();
                  }}
                >
                  <svg className="svg-icon"><use href="#icon-trophy" /></svg> Go to Winner Page
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sections' && (
          <div className="admin-tab-content active" id="tab-sections">
            <div className="section-list" id="sectionList">
              <div className="admin-section" style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '2px solid #1a1a1a', marginBottom: '8px' }}>
                <strong>Guess the Frame</strong> — 20 active stills
              </div>
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="admin-tab-content active" id="tab-players">
            <div className="admin-grid">
              <div className="admin-section">
                <h3><svg className="svg-icon"><use href="#icon-users" /></svg> Players</h3>
                <div className="player-list" id="playerList">
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>Manage active lobby players from the main lobby screen.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sounds' && (
          <div className="admin-tab-content active" id="tab-sounds">
            <div className="admin-grid">
              <div className="admin-section full-width">
                <h3><svg className="svg-icon"><use href="#icon-volume-2" /></svg> Sound Customization</h3>
                <div className="snd-reset-bar">
                  <button className="snd-reset-btn" onClick={() => SoundManager.resetSounds()}>↺ Reset All to Default</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModal;
