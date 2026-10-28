import { Link, useNavigate } from "react-router";
import { useState, type FormEvent } from "react";
import { listCategories, listProducts } from "../api/catalog";
import { LoadError } from "../components/ui/LoadError";
import { LoadingState } from "../components/ui/LoadingState";
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
    <ul className="category-grid">
      {withProducts.map((category) => (
        <li key={category.id}>
          <Link to={`/machines?category=${category.id}`} className="category-card">
            <span className="category-card__name">{category.name}</span>
            {category.description && <span className="category-card__description">{category.description}</span>}
            <span className="category-card__count">
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

export function HomePage() {
  return (
    <>
      <title>Devdutt Industries | Pipe and tube machinery</title>
      <section className="hero">
        <div className="container hero__inner">
          <p className="eyebrow">Manufacturer of tube solution machines</p>
          <h1 className="hero__title">Pipe bending, notching and end forming machines</h1>
          <p className="hero__lead">
            Browse our machines with prices and specifications, then request a quotation for your requirement.
            No account needed.
          </p>
          <HeroSearch />
        </div>
      </section>

      <section className="container page-section" aria-labelledby="categories-heading">
        <div className="section-heading">
          <h2 id="categories-heading">Machine categories</h2>
          <Link to="/machines">View all machines</Link>
        </div>
        <CategoryList />
      </section>

      <section className="container page-section page-section--flush" aria-labelledby="recent-heading">
        <div className="section-heading">
          <h2 id="recent-heading">Recently added machines</h2>
          <Link to="/machines">View all machines</Link>
        </div>
        <RecentMachines />
      </section>

      <section className="container page-section">
        <div className="quote-banner">
          <div>
            <h2 className="quote-banner__title">Need a machine for a specific job?</h2>
            <p className="quote-banner__text">
              Pick the closest machine and describe your pipe sizes and production needs. Our sales team will reply
              with a quotation.
            </p>
          </div>
          <Link to="/machines" className="button button--accent">
            Choose a machine
          </Link>
        </div>
      </section>
    </>
  );
}
