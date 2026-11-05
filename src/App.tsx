import { lazy, Suspense } from 'react';
import { useReveal } from '@/app/useReveal';
import { About } from '@/components/organisms/About';
import { BuildNotes } from '@/components/organisms/BuildNotes';
import { Certifications } from '@/components/organisms/Certifications';
import { Footer } from '@/components/organisms/Footer';
import { Hero } from '@/components/organisms/Hero';
import { Nav } from '@/components/organisms/Nav';
import { Projects } from '@/components/organisms/Projects';
import { Skills } from '@/components/organisms/Skills';

/**
 * The creative feature is split into its own chunk. It is the heaviest part of the
 * bundle, and deferring it keeps the first paint limited to type, layout and the hero
 * constellation.
 */
const Sphere = lazy(() =>
  import('@/components/sphere/Sphere').then((module) => ({ default: module.Sphere })),
);

export function App() {
  useReveal();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Nav />

      <main id="main">
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Certifications />

        <Suspense
          fallback={
            <section id="lab" className="section lab" aria-busy="true">
              <div className="container">
                <div className="skeleton skeleton--canvas" aria-hidden="true" />
                <p className="mono">loading the lab…</p>
              </div>
            </section>
          }
        >
          <Sphere />
        </Suspense>

        <BuildNotes />
      </main>

      <Footer />
    </>
  );
}
