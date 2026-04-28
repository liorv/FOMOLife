'use client';

import React from 'react';
import ReleaseNotes from './ReleaseNotes';
import homeStyles from './HomePage.module.css';
import headerStyles from './ContentHeader.module.css';

type Props = {
  title: string;
};

export default function ContentHeader({ title }: Props) {
  return (
    <div className={headerStyles.header}>
      <h1 className={homeStyles.title}>{title}</h1>
      <div className={homeStyles.headerActions}>
        <a
          href="https://paypal.me/lior441"
          target="_blank"
          rel="noopener noreferrer"
          className={homeStyles.paypalLink}
        >
          <svg className={homeStyles.paypalIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.824l-1.338 8.49h3.607c.524 0 .969-.382 1.051-.9l.944-5.983c.083-.518.527-.9 1.051-.9h.663c4.296 0 7.662-1.747 8.647-6.797.35-1.798.073-3.062-.827-3.705z" />
          </svg>
          <span className={homeStyles.buttonText}>Support this project</span>
        </a>

        <a
          href="https://www.buymeacoffee.com/liorv"
          target="_blank"
          rel="noopener noreferrer"
          className={homeStyles.bmcLink}
        >
          <img
            src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
            alt=""
            className={homeStyles.bmcIcon}
          />
          <span className={homeStyles.buttonText}>Buy me a coffee</span>
        </a>

        <ReleaseNotes />
      </div>
    </div>
  );
}
