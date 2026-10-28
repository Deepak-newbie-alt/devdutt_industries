import { Link, useNavigate } from "react-router";
import { useState, type FormEvent } from "react";
import { listCategories, listProducts } from "../api/catalog";
import { LoadError } from "../components/ui/LoadError";
import { LoadingState } from "../components/ui/LoadingState";
import { TubeBendDrawing } from "../features/catalog/MachineDrawing";
import { ProductCard } from "../features/catalog/ProductCard";
import { useApiQuery } from "../hooks/useApiQuery";

function HeroSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = query.trim();
    navigate(text ? `/machines?q=${encodeURIComponent(text)}` : "/machines");
  }

  return (
    <form className="hero-search" role="search" onSubmit={submit}>
      <label htmlFor="hero-search-input" className="visually-hidden">
        Search machines by name
      </label>
      <input
        id="hero-search-input"
        className="input hero-search__input"
        type="search"
        value={query}
        maxLength={200}
        placeholder="Search machines, e.g. pipe bending"
        onChange={(event) => setQuery(event.target.value)}
      />
      <button type="submit" className="button button--primary">
        Search
      </button>
    </form>
  );
}

function CategoryList() {
  const categories = useApiQuery((signal) => listCategories(signal), []);

  if (categories.status === "loading") {
    return <LoadingState label="Loading categories" />;
  }

  if (categories.status === "error") {
    return <LoadError title="Categories couldn't be loaded" error={categories.error} onRetry={categories.reload} />;
  }

  // Empty categories would lead to an empty catalog page, so they're left out here.
  const withProducts = categories.data.filter((category) => category.products.length > 0);

  if (withProducts.length === 0) {
    return <p className="muted">Machine categories will appear here soon.</p>;
  }

  return (
    <ul className="category-list">
      {withProducts.map((category) => (
        <li key={category.id}>
          <Link to={`/machines?category=${category.id}`} className="category-row">
            <span className="category-row__name">{category.name}</span>
            {category.description && <span className="category-row__description">{category.description}</span>}
            <span className="category-row__count arrow-link">
              {category.products.length === 1 ? "1 machine" : `${category.products.length} machines`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RecentMachines() {
  // The backend lists newest first; there is no "featured" flag yet.
  const products = useApiQuery((signal) => listProducts({ limit: 4 }, signal), []);

  if (products.status === "loading") {
    return <LoadingState label="Loading machines" />;
  }

  if (products.status === "error") {
    return <LoadError title="Machines couldn't be loaded" error={products.error} onRetry={products.reload} />;
  }

  if (products.data.products.length === 0) {
    return <p className="muted">Machines will appear here soon.</p>;
  }

  return (
    <ul className="product-grid">
      {products.data.products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

// The steps a customer actually goes through on this site, in order.
const QUOTE_STEPS = [
  {
    title: "Choose a machine",
    text: "Compare prices and specifications in the catalog and pick the closest match.",
  },
  {
    title: "Describe your requirement",
    text: "Tell us your pipe sizes, quantities and production needs. We confirm your mobile number with a one-time code.",
  },
  {
    title: "Receive a quotation",
    text: "Our sales team prepares a quotation for your requirement and sends it to you.",
  },
  {
    title: "Accept or ask for changes",
    text: "Respond to the quotation online, and follow every enquiry from My enquiries.",
  },
] as const;

export function HomePage() {
  return (
    <>
      <title>Devdutt Industries | Pipe and tube machinery</title>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="container hero__inner">
          <div className="hero__copy">
            <h1 id="hero-heading" className="hero__title">
              Machines that shape tube and pipe
            </h1>
            <p className="hero__lead">
              We manufacture pipe bending, notching and end forming machines. See prices and specifications, then
              request a quotation for your requirement. No account needed.
            </p>
            <HeroSearch />
            <p className="hero__actions">
              <Link to="/machines" className="arrow-link hero__link">
                Browse all machines
              </Link>
              <Link to="/my-inquiries" className="arrow-link hero__link">
                Check on an enquiry
              </Link>
            </p>
          </div>
          <div className="hero__drawing">
            <TubeBendDrawing />
          </div>
        </div>
      </section>

      <section className="container page-section home-categories" aria-labelledby="categories-heading">
        <div className="home-categories__intro">
          <h2 id="categories-heading">Machine categories</h2>
          <p className="muted">Every machine is listed with its price and specifications.</p>
          <Link to="/machines" className="arrow-link">
            View all machines
          </Link>
        </div>
        <CategoryList />
      </section>

      <section className="home-recent" aria-labelledby="recent-heading">
        <div className="container page-section">
          <div className="section-heading">
            <h2 id="recent-heading">Recently added machines</h2>
            <Link to="/machines" className="arrow-link">
              View all machines
            </Link>
          </div>
          <RecentMachines />
        </div>
      </section>

      <section className="container page-section quote-steps" aria-labelledby="steps-heading">
        <div className="quote-steps__intro">
          <h2 id="steps-heading">How a quotation works</h2>
          <p>
            Pick the closest machine and describe your pipe sizes and production needs. Our sales team will reply
            with a quotation.
          </p>
          <Link to="/machines" className="button button--accent button--large">
            Choose a machine
          </Link>
        </div>
        <ol className="quote-steps__list">
          {QUOTE_STEPS.map((step) => (
            <li key={step.title} className="quote-steps__item">
              <h3 className="quote-steps__title">{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
