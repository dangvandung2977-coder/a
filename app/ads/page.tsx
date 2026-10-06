import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Download, Monitor, Smartphone } from 'lucide-react';
import AppBrand from '@/components/AppBrand';
import './ads.css';

export const metadata: Metadata = {
  title: 'The Ad Cut — GYM PROGRESSION',
  description: 'Watch and download the 30-second Gym Progression ad. Full HD, original sound, captions, and two formats ready to share.',
};

const cuts = [
  { format: 'portrait', title: 'Made for the scroll.', label: 'VERTICAL · 9:16', platforms: 'Reels, Stories & Shorts', width: 1080, height: 1920, Icon: Smartphone },
  { format: 'landscape', title: 'Built for the big picture.', label: 'WIDESCREEN · 16:9', platforms: 'YouTube, websites & presentations', width: 1920, height: 1080, Icon: Monitor },
];

export default function AdsPage() {
  return <main className="ad-library" lang="en">
    <header className="ad-header">
      <Link href="/" aria-label="Gym Progression home"><AppBrand /></Link>
      <Link href="/app">OPEN THE APP <ArrowUpRight size={17} aria-hidden="true" /></Link>
    </header>
    <div className="ad-intro">
      <Link className="ad-back" href="/"><ArrowLeft size={14} aria-hidden="true" /> BACK TO THE FULL FILM</Link>
      <p className="ad-eyebrow">30 SECONDS. EVERY FRAME MOVES YOU FORWARD.</p>
      <h1>THE AD <em>CUT.</em></h1>
      <p className="ad-description">Animated type. Real product demos. A stronger finish.</p>
      <div className="ad-specs"><span>FULL HD</span><span>30 FPS</span><span>SOUND + CAPTIONS</span><span>MP4 DOWNLOADS</span></div>
    </div>
    <section className="ad-grid" aria-label="Ad previews and downloads">
      {cuts.map(({ format, title, label, platforms, width, height, Icon }) => {
        const source = `/videos/gym-progression-ad-${format}`;
        return <article key={format} className={`ad-cut ad-cut-${format}`}>
          <div className="ad-cut-heading"><span><Icon size={16} aria-hidden="true" /> {label}</span><span>00:30</span></div>
          <div className="ad-video-wrap">
            <video controls playsInline preload="metadata" width={width} height={height} poster={`${source}.jpg`} aria-label={`30-second ${format} Gym Progression ad`}>
              <source src={`${source}.mp4`} type="video/mp4" />
              <track kind="captions" src="/videos/gym-progression-ad.en.vtt" srcLang="en" label="English" />
              Your browser cannot play this video. Use the download link below to watch it.
            </video>
          </div>
          <div className="ad-cut-info"><h2>{title}</h2><p>{platforms} <span>{width} × {height}</span></p></div>
          <a className="ad-download" href={`${source}.mp4`} download><Download size={18} aria-hidden="true" /> DOWNLOAD {format === 'portrait' ? 'VERTICAL' : 'WIDESCREEN'} MP4 <ArrowUpRight size={18} aria-hidden="true" /></a>
        </article>;
      })}
    </section>
    <footer className="ad-footer"><span>TRAIN. TRACK. EVOLVE.</span><Link href="/">Watch the full 60-second film <ArrowUpRight size={14} aria-hidden="true" /></Link></footer>
  </main>;
}
