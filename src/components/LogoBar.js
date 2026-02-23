import React from "react";

// A simple horizontal bar that sits at the top of the app and contains the
// FOMO logo plus, optionally, a search field.  It is kept dumb so the
// parent manages the query state and decides when the search box should be
// shown (currently only on the tasks view).
export default function LogoBar({
  logoUrl = "/assets/logo_fomo.png",
  // children are rendered in the center row; the app can pass the
  // search/filters component when on the tasks tab.  This keeps the title
  // bar layout flexible while decoupling task‑specific logic from the
  // logo itself.
  children,
}) {
  return (
    <div className="title-bar">
      <div className="left-column">
        <img src={logoUrl} alt="FOMO logo" className="title-logo" />
      </div>
      <div className="mid-column">
        <div className="mid-row top" />
        <div className="mid-row center">{children}</div>
        <div className="mid-row bottom" />
      </div>
      <div className="right-column" />
    </div>
  );
}
