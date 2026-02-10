import React, { useState, useEffect } from 'react';
import { apiFetch, apiPut } from '../lib/fetch';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  subscriptionTier: 'free' | 'pro';
  generationsToday: number;
  generationLimit: number;
  totalGenerations: number;
  joinedAt: string;
  stats: {
    courses: number;
    flashcardDecks: number;
    quizzes: number;
    matchingGames: number;
    wordScrambleGames: number;
    fillBlankGames: number;
  };
}

interface ProfilePageProps {
  onBack: () => void;
  userEmail?: string;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack, userEmail }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await apiFetch('/profile');
      const data = await res.json();
      setProfile(data);
      setDisplayName(data.displayName || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await apiPut('/profile', { displayName });
      setProfile({ ...profile, displayName });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <button className="back-button" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        </div>
        <p>Failed to load profile.</p>
      </div>
    );
  }

  const totalContent = Object.values(profile.stats).reduce((a, b) => a + b, 0);

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="back-button" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <h1>Profile</h1>
      </div>

      <div className="profile-content">
        {/* User Info Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {(profile.displayName || profile.email || '?')[0].toUpperCase()}
            </div>
            <div className="profile-badge-wrapper">
              <span className={`subscription-badge ${profile.subscriptionTier}`}>
                {profile.subscriptionTier === 'pro' ? '⭐ Pro' : 'Free'}
              </span>
            </div>
          </div>
          
          <div className="profile-info">
            {editing ? (
              <div className="profile-edit-form">
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="profile-input"
                  autoFocus
                />
                <div className="profile-edit-actions">
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setDisplayName(profile.displayName); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="profile-name">
                  {profile.displayName || 'User'}
                  <button className="edit-btn" onClick={() => setEditing(true)} title="Edit name">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </h2>
                <p className="profile-email">{profile.email}</p>
                <p className="profile-joined">Joined {formatDate(profile.joinedAt)}</p>
              </>
            )}
          </div>
        </div>

        {/* Usage Card */}
        <div className="profile-card">
          <h3 className="card-title">Daily Usage</h3>
          <div className="usage-bar-container">
            <div className="usage-bar">
              <div 
                className="usage-bar-fill"
                style={{ width: `${Math.min((profile.generationsToday / profile.generationLimit) * 100, 100)}%` }}
              />
            </div>
            <div className="usage-text">
              <span>{profile.generationsToday} / {profile.subscriptionTier === 'pro' ? '∞' : profile.generationLimit}</span>
              <span>generations today</span>
            </div>
          </div>
          <p className="usage-total">Total generations: <strong>{profile.totalGenerations}</strong></p>
        </div>

        {/* Stats Card */}
        <div className="profile-card">
          <h3 className="card-title">Content Created</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-icon">📚</span>
              <span className="stat-value">{profile.stats.courses}</span>
              <span className="stat-label">Courses</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">❓</span>
              <span className="stat-value">{profile.stats.quizzes}</span>
              <span className="stat-label">Quizzes</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🃏</span>
              <span className="stat-value">{profile.stats.flashcardDecks}</span>
              <span className="stat-label">Flashcards</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🎯</span>
              <span className="stat-value">{profile.stats.matchingGames}</span>
              <span className="stat-label">Match</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🔤</span>
              <span className="stat-value">{profile.stats.wordScrambleGames}</span>
              <span className="stat-label">Scramble</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📝</span>
              <span className="stat-value">{profile.stats.fillBlankGames}</span>
              <span className="stat-label">Fill Blank</span>
            </div>
          </div>
          <div className="stat-total">
            <strong>{totalContent}</strong> total items created
          </div>
        </div>

        {/* Subscription Card */}
        <div className="profile-card subscription-card">
          <h3 className="card-title">Subscription</h3>
          {profile.subscriptionTier === 'pro' ? (
            <div className="subscription-info pro">
              <div className="sub-icon">⭐</div>
              <h4>Pro Plan</h4>
              <p>Unlimited generations, priority support, and all features unlocked.</p>
              <ul className="sub-features">
                <li>✓ Unlimited daily generations</li>
                <li>✓ All content types</li>
                <li>✓ Priority AI processing</li>
                <li>✓ Community sharing</li>
              </ul>
            </div>
          ) : (
            <div className="subscription-info free">
              <div className="sub-icon">🆓</div>
              <h4>Free Plan</h4>
              <p>{profile.generationLimit} generations per day.</p>
              <button className="btn btn-primary upgrade-btn">
                Upgrade to Pro ⭐
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
