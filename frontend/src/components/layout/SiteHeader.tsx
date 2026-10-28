import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "site-nav__link site-nav__link--active" : "site-nav__link";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu after navigating.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="brand" aria-label="Devdutt Industries home">
          <span className="brand__mark" aria-hidden="true">DI</span>
          <span className="brand__name">Devdutt Industries</span>
        </Link>

        <button
          type="button"
          className="site-header__menu-button"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>

        <nav id="site-nav" className={menuOpen ? "site-nav site-nav--open" : "site-nav"} aria-label="Main">
          <ul className="site-nav__list">
            <li>
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/machines" className={navLinkClass}>
                Machines
              </NavLink>
            </li>
            <li>
              <NavLink to="/my-inquiries" className={navLinkClass}>
                My enquiries
              </NavLink>
            </li>
            <li>
              <a href="#contact" className="site-nav__link">
                Contact
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
