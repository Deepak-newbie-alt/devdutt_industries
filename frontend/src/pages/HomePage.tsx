import { Link, useNavigate } from "react-router";
import { useState, type FormEvent } from "react";
import { listCategories, listProducts } from "../api/catalog";
import { LoadError } from "../components/ui/LoadError";
import { LoadingState } from "../components/ui/LoadingState";
import { ProductCard } from "../features/catalog/ProductCard";
import { ProductVideos } from "../features/catalog/ProductVideos";
import { useApiQuery } from "../hooks/useApiQuery";
import type { Product } from "../types/api";

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
      <button type="submit" className="button button--accent">
        Search
      </button>
    </form>
  );
}

// The category index in the hero: real categories with their machine counts.
function CategoryIndex() {
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
            <span className="category-row__count">
              {category.products.length === 1 ? "1 machine" : `${category.products.length} machines`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Product videos from the catalog, each with the machine it belongs to; nothing shows when there are none.
function MachinesAtWork({ products }: { products: Product[] }) {
  const withVideos = products.filter((product) => product.videos.length > 0).slice(0, 2);

  if (withVideos.length === 0) {
    return null;
  }

  return (
    <section className="home-videos" aria-labelledby="videos-heading">
      <div className="container page-section home-videos__inner">
        <div className="home-videos__intro">
          <p className="eyebrow">On video</p>
          <h2 id="videos-heading">Our machines at work</h2>
          <p>Product videos, each linked to its machine's prices and specifications.</p>
        </div>
        <div className="home-videos__grid">
          {withVideos.map((product) => (
            <div key={product.id} className="home-videos__item">
              <ProductVideos videos={product.videos.slice(0, 1)} />
              <Link to={`/machines/${product.id}`} className="arrow-link home-videos__link">
                {product.name}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
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
  // Newest first (there is no "featured" flag); the first four are shown, and any videos among
  // the newest machines are shown further down.
  const products = useApiQuery((signal) => listProducts({ limit: 24 }, signal), []);

  return (
    <>
      <title>Devdutt Industries | Pipe and tube machinery</title>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="container hero__inner">
          <div className="hero__copy">
            <p className="eyebrow hero__tagline">Your imagination our creation</p>
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

          <section className="hero__panel" aria-labelledby="categories-heading">
            <h2 id="categories-heading" className="hero__panel-title">
              Machine categories
            </h2>
            <CategoryIndex />
            <Link to="/machines" className="arrow-link hero__panel-link">
              View all machines
            </Link>
          </section>
        </div>
      </section>

      <section className="container page-section" aria-labelledby="recent-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2 id="recent-heading">Recently added machines</h2>
          </div>
          <Link to="/machines" className="arrow-link">
            View all machines
          </Link>
        </div>
        {products.status === "loading" && <LoadingState label="Loading machines" />}
        {products.status === "error" && (
          <LoadError title="Machines couldn't be loaded" error={products.error} onRetry={products.reload} />
        )}
        {products.status === "success" &&
          (products.data.products.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__title">Machines will appear here soon</p>
            </div>
          ) : (
            <ul className="product-grid">
              {products.data.products.slice(0, 4).map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          ))}
      </section>

      {products.status === "success" && <MachinesAtWork products={products.data.products} />}

      <section className="quote-steps-band" aria-labelledby="steps-heading">
        <div className="container page-section quote-steps">
          <div className="quote-steps__intro">
            <p className="eyebrow">How it works</p>
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
        </div>
      </section>
    </>
  );
}
