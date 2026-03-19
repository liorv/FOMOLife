const fs = require('fs');
let content = fs.readFileSync('components/contacts/ContactsPage.tsx', 'utf8');

const targetStr = `  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '40px', paddingBottom: '40px' }}>
      <div className="content-panel">
        <div className={styles.page}>
          {!displayReady ? (
            // Show nothing while waiting for framework acknowledgment to prevent layout flicker
            <div style={{ height: '100vh' }} />
          ) : (
            <section className={styles.shell}>`;

const replaceStr = `  return (
    <div style={{ ...(style || {}), display: !displayReady || style?.display === 'none' ? 'none' : (style?.display || 'flex'), flexDirection: 'column', paddingTop: '40px', paddingBottom: '40px' }} className={className}>
      <div className="content-panel">
        <div className={styles.page}>
          {!displayReady ? (
            // Show nothing while waiting for framework acknowledgment to prevent layout flicker
            <div style={{ height: '100vh' }} />
          ) : (
            <section className={styles.shell}>`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('components/contacts/ContactsPage.tsx', content);
