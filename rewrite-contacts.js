const fs = require('fs');
let content = fs.readFileSync('components/contacts/ContactsPage.tsx', 'utf8');

const targetStr = `  return (
    <div style={{ ...(style || {}), display: !displayReady || style?.display === 'none' ? 'none' : (style?.display || 'flex'), flexDirection: 'column', paddingTop: '40px', paddingBottom: '40px' }} className={className}>
      <div className="content-panel">
        <div className={styles.page}>
          {!displayReady ? (
            // Show nothing while waiting for framework acknowledgment to prevent layout flicker
            <div style={{ height: '100vh' }} />
          ) : (
            <section className={styles.shell}>
          <header className={styles.header}>
            <div></div> {/* empty left spacer */}`;

const replaceStr = `  return (
    <div className={\`content-panel \${className || ""}\`} style={{ ...(style || {}), display: !displayReady || style?.display === 'none' ? 'none' : (style?.display || 'flex') }}>
      {!displayReady ? (
        <div style={{ height: 0 }} />
      ) : (
        <section className={styles.shell}>
          <header className={styles.header}>
            <div></div> {/* empty left spacer */}`;

content = content.replace(targetStr, replaceStr);

const endTargetStr = `            </div>
          )}
        </section>
      )}
    </div>
    </div>
    {canManage && displayReady && (
      <button
        type="button"
        className="content-fab"
        aria-label="Generate invite link"
        onClick={() => void generateInviteLink()}
      >
        <span className="material-icons">person_add</span>
      </button>
    )}

    </div>
);`;

// Let me ensure exact match by using regex for the end replacement to avoid whitespace mismatch issues.

content = content.replace(endTargetStr, `            </div>
          )}
        </section>
      )}

      {canManage && displayReady && (
        <button
          type="button"
          className="content-fab"
          aria-label="Generate invite link"
          onClick={() => void generateInviteLink()}
        >
          <span className="material-icons">person_add</span>
        </button>
      )}
    </div>
  );
`);

// just in case exact literal string match failed, do a regex replacing of the trailing div chaos
content = content.replace(/      \)\}\n    <\/div>\n    <\/div>\n    \{canManage \&\& displayReady \&\& \(\n      <button/ms, `      )}\n      {canManage && displayReady && (\n      <button`);
content = content.replace(/    \)\}\n\n    <\/div>\n\);/ms, `    )}\n    </div>\n  );\n`);
fs.writeFileSync('components/contacts/ContactsPage.tsx', content);

