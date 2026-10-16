import os

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix import
code = code.replace(
    "import AdminAllowlistModal from './components/modals/AdminAllowlistModal';",
    ""
)

# Fix component rendering
old_comp = """      {currentUser.role === 'admin' && (
        <AdminAllowlistModal
          currentUser={currentUser}
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          allowedUsers={allowedUsers}
          onUpdateAllowedUsers={setAllowedUsers}
          geminiApiKey={geminiApiKey}
          onChangeGeminiApiKey={handleChangeGeminiApiKey}
          enforcePasswordPolicy={enforcePasswordPolicy}
          onChangeEnforcePasswordPolicy={handleChangeEnforcePasswordPolicy}
          sessionTimeout={sessionTimeout}
          onChangeSessionTimeout={handleChangeSessionTimeout}
          dataRetention={dataRetention}
          onChangeDataRetention={handleChangeDataRetention}
          enforceTrialNda={enforceTrialNda}
          onChangeEnforceTrialNda={handleChangeEnforceTrialNda}
          adminRequests={adminRequests}
          onDismissAdminRequest={handleDismissAdminRequest}
          cloudSyncState={cloudSyncState}
        />
      )}"""

new_comp = """      {currentUser.role === 'admin' && (
        <AllowlistAuthGate
          currentUser={currentUser}
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          allowedUsers={allowedUsers}
          onUpdateAllowedUsers={setAllowedUsers}
          geminiApiKey={geminiApiKey}
          onChangeGeminiApiKey={handleChangeGeminiApiKey}
          enforcePasswordPolicy={enforcePasswordPolicy}
          onChangeEnforcePasswordPolicy={handleChangeEnforcePasswordPolicy}
          adminRequests={adminRequests}
          onDismissAdminRequest={handleDismissAdminRequest}
          cloudSyncState={cloudSyncState}
        />
      )}"""

code = code.replace(old_comp, new_comp)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
