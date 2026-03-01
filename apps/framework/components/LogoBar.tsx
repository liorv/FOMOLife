'use client';

type LogoBarProps = {
  appName: string;
  logoUrl?: string;
};

export default function LogoBar({ appName, logoUrl = '/assets/logo_fomo.png' }: LogoBarProps) {
  return (
    <header className="title-bar">
      <div className="left-column">
        <img src={logoUrl} alt="FOMO Life logo" className="title-logo" />
      </div>
      <div className="mid-column">
        <div className="mid-row" />
        <div className="mid-row center">
          <span className="bar-title-text">{appName}</span>
        </div>
        <div className="mid-row" />
      </div>
      <div className="right-column" />
    </header>
  );
}
