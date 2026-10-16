import os
import re

with open('src/components/modals/AdminAllowlistModal.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the wrong column body
wrong_column = """                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(Array.isArray(u.groups) ? u.groups : (u.group ? [u.group] : [])).map(g => (
                                <span key={g} style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '11px', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>{g}</span>
                              ))}
                            </div>
                          </td>"""

correct_column = """                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: u.isTrialUser ? 'var(--primary-deep)' : 'var(--text-muted)' }}>
                                <input type="checkbox" checked={Boolean(u.isTrialUser)} onChange={e => handleToggleUserTrialMode(u, e.target.checked)} />
                                ניסיון (Trial)
                              </label>
                              {u.mustChangePassword && <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', display: 'inline-block', width: 'fit-content' }}>⚠️ טרם התחבר</span>}
                              {u.isTrialUser && (() => {
                                const trialExpired = isTrialUserExpired(u);
                                const remainingDays = getTrialRemainingDays(u);
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <input type="number" min="1" max="365" value={u.trialDays || DEFAULT_TRIAL_DAYS} onChange={e => handleUpdateUserTrialDays(u, e.target.value)} style={{ width: '50px', padding: '2px', fontSize: '12px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-main)', borderRadius: '4px' }} /> ימים
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: trialExpired ? '#dc2626' : 'var(--primary)' }}>
                                      {trialExpired ? 'פג תוקף' : remainingDays !== null ? `⏳ נותרו ${remainingDays} ימים` : ''}
                                    </span>
                                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: u.ndaSigned ? '#ecfdf5' : '#fffbeb', color: u.ndaSigned ? '#047857' : '#b45309', display: 'inline-block', width: 'fit-content' }}>
                                      {u.ndaSigned ? '✍️ NDA נחתם ✓' : '📄 ממתין ל-NDA'}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>"""

code = code.replace(wrong_column, correct_column)

# Also fix the name column to include groups, as I missed that as well if the first replace failed
wrong_name_column = """                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.name}</td>"""
correct_name_column = """                          <td style={{ padding: '12px', fontWeight: 'bold' }}>
                            {u.name}
                            {u.groups && u.groups.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                {u.groups.map(g => (
                                  <span key={g} style={{ background: 'var(--bg-warm-subtle)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '12px', fontSize: '10px' }}>{g}</span>
                                ))}
                              </div>
                            )}
                          </td>"""

code = code.replace(wrong_name_column, correct_name_column)

with open('src/components/modals/AdminAllowlistModal.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Second patch applied.")
