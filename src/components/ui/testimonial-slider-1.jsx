import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Star } from 'lucide-react'

const ease = [0.4, 0, 0.2, 1]

export function TestimonialSlider({ reviews = [], className = '' }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState('right')

  const activeReview = reviews[currentIndex]
  const thumbnails = useMemo(() => {
    if (!reviews.length) return []
    return reviews
      .map((review, index) => ({ review, index }))
      .filter((item) => item.index !== currentIndex)
      .slice(0, 3)
  }, [reviews, currentIndex])

  if (!reviews.length || !activeReview) return null

  const handleNext = () => {
    setDirection('right')
    setCurrentIndex((prev) => (prev + 1) % reviews.length)
  }

  const handlePrev = () => {
    setDirection('left')
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length)
  }

  const handleThumbnailClick = (index) => {
    setDirection(index > currentIndex ? 'right' : 'left')
    setCurrentIndex(index)
  }

  const imageVariants = {
    enter: (dir) => ({ y: dir === 'right' ? '100%' : '-100%', opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (dir) => ({ y: dir === 'right' ? '-100%' : '100%', opacity: 0 }),
  }

  const textVariants = {
    enter: (dir) => ({ x: dir === 'right' ? 44 : -44, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir === 'right' ? -44 : 44, opacity: 0 }),
  }

  return (
    <div className={`tf-testimonial-slider ${className}`}>
      <style>{`
        .tf-testimonial-slider{
          position:relative;
          width:100%;
          min-height:480px;
          overflow:visible;
          color:#112740;
          background:transparent;
          border-radius:0;
          padding:clamp(12px,2vw,30px) 0;
          box-shadow:none;
        }
        .tf-testimonial-slider::before{
          content:'';
          position:absolute;
          inset:0;
          display:none;
          pointer-events:none;
        }
        .tf-testimonial-grid{
          position:relative;
          z-index:1;
          display:grid;
          grid-template-columns:170px minmax(290px,430px) minmax(0,1fr);
          gap:clamp(24px,3vw,46px);
          align-items:stretch;
          min-height:430px;
        }
        .tf-testimonial-meta{
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          gap:24px;
        }
        .tf-testimonial-count{
          color:#64748b;
          font:700 14px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;
        }
        .tf-testimonial-label{
          display:inline-flex;
          width:max-content;
          color:#f8db13;
          font:800 13px/1 Inter,system-ui,sans-serif;
          letter-spacing:.16em;
          text-transform:uppercase;
          writing-mode:vertical-rl;
          transform:rotate(180deg);
        }
        .tf-testimonial-thumbs{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }
        .tf-testimonial-thumb{
          width:72px;
          height:88px;
          border:1px solid #dbe3ee;
          border-radius:12px;
          overflow:hidden;
          padding:0;
          background:#fff;
          cursor:pointer;
          opacity:.68;
          box-shadow:0 10px 24px rgba(17,39,64,.08);
        }
        .tf-testimonial-thumb:hover,
        .tf-testimonial-thumb:focus-visible{
          opacity:1;
          border-color:#f8db13;
          outline:none;
        }
        .tf-testimonial-thumb img{
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }
        .tf-testimonial-image{
          position:relative;
          min-height:430px;
          border-radius:22px;
          overflow:hidden;
          background:#0a1838;
          box-shadow:0 24px 50px rgba(17,39,64,.18);
        }
        .tf-testimonial-image img{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }
        .tf-testimonial-image::after{
          content:'';
          position:absolute;
          inset:0;
          pointer-events:none;
          background:linear-gradient(180deg,transparent 45%,rgba(13,32,53,.52));
        }
        .tf-testimonial-rating{
          position:absolute;
          left:18px;
          top:18px;
          z-index:2;
          display:inline-flex;
          align-items:center;
          gap:6px;
          background:rgba(255,255,255,.94);
          color:#112740;
          border-radius:999px;
          padding:10px 14px;
          font-weight:900;
          box-shadow:0 10px 24px rgba(0,0,0,.18);
        }
        .tf-testimonial-rating svg{
          width:16px;
          height:16px;
          fill:#f8db13;
          color:#f8db13;
        }
        .tf-testimonial-copy{
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          gap:30px;
          padding:clamp(8px,2vw,36px) 0;
        }
        .tf-testimonial-kicker{
          margin:0 0 8px;
          color:#f8db13;
          font-size:14px;
          font-weight:900;
          letter-spacing:.08em;
          text-transform:uppercase;
        }
        .tf-testimonial-name{
          margin:0;
          color:#112740;
          font-family:'Inter Tight',Inter,system-ui,sans-serif;
          font-size:clamp(30px,3.2vw,56px);
          line-height:.98;
          font-weight:800;
        }
        .tf-testimonial-affiliation{
          margin:12px 0 0;
          max-width:560px;
          color:#64748b;
          font-size:clamp(15px,1.1vw,18px);
          line-height:1.5;
          font-weight:600;
        }
        .tf-testimonial-quote{
          margin:34px 0 0;
          max-width:680px;
          color:#112740;
          font-size:clamp(24px,2.3vw,38px);
          line-height:1.16;
          font-weight:800;
        }
        .tf-testimonial-reviewer{
          margin:18px 0 0;
          color:#64748b;
          font-size:15px;
          font-weight:700;
        }
        .tf-testimonial-reviewer span{
          color:#f8db13;
        }
        .tf-testimonial-nav{
          display:flex;
          align-items:center;
          gap:12px;
        }
        .tf-testimonial-nav button{
          width:50px;
          height:50px;
          border-radius:50%;
          border:1px solid #cbd5e1;
          display:grid;
          place-items:center;
          background:#fff;
          color:#112740;
          cursor:pointer;
          box-shadow:0 10px 24px rgba(17,39,64,.1);
        }
        .tf-testimonial-nav button:last-child{
          background:#f8db13;
          border-color:#f8db13;
          color:#112740;
        }
        .tf-testimonial-nav button:hover{
          transform:translateY(-2px);
          box-shadow:0 12px 24px rgba(0,0,0,.18);
        }
        .tf-testimonial-nav svg{
          width:20px;
          height:20px;
        }
        @media (max-width:980px){
          .tf-testimonial-slider{ min-height:auto; }
          .tf-testimonial-grid{
            grid-template-columns:1fr;
            min-height:0;
          }
          .tf-testimonial-meta{
            order:2;
            flex-direction:row;
            align-items:flex-end;
          }
          .tf-testimonial-label{
            display:none;
          }
          .tf-testimonial-image{
            order:1;
            min-height:360px;
          }
          .tf-testimonial-copy{
            order:3;
            padding:0;
          }
        }
        @media (max-width:620px){
          .tf-testimonial-slider{
            border-radius:22px;
            padding:24px;
          }
          .tf-testimonial-image{
            min-height:300px;
          }
          .tf-testimonial-thumb{
            width:58px;
            height:72px;
          }
          .tf-testimonial-meta{
            align-items:center;
          }
          .tf-testimonial-quote{
            font-size:23px;
          }
        }
      `}</style>

      <div className="tf-testimonial-grid">
        <aside className="tf-testimonial-meta">
          <div>
            <span className="tf-testimonial-count">
              {String(currentIndex + 1).padStart(2, '0')} / {String(reviews.length).padStart(2, '0')}
            </span>
            <h2 className="tf-testimonial-label">Reseñas</h2>
          </div>

          <div className="tf-testimonial-thumbs">
            {thumbnails.map(({ review, index }) => (
              <button
                key={review.id}
                className="tf-testimonial-thumb"
                onClick={() => handleThumbnailClick(index)}
                aria-label={`Ver reseña para ${review.name}`}
              >
                <img src={review.thumbnailSrc || review.imageSrc} alt="" />
              </button>
            ))}
          </div>
        </aside>

        <div className="tf-testimonial-image">
          <AnimatePresence initial={false} custom={direction}>
            <motion.img
              key={activeReview.id}
              src={activeReview.imageSrc}
              alt={activeReview.name}
              custom={direction}
              variants={imageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.55, ease }}
            />
          </AnimatePresence>
          <div className="tf-testimonial-rating">
            <Star aria-hidden="true" />
            {Number(activeReview.rating || 5).toFixed(1)}
          </div>
        </div>

        <section className="tf-testimonial-copy">
          <div className="tf-testimonial-text">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={activeReview.id}
                custom={direction}
                variants={textVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.55, ease }}
              >
                <p className="tf-testimonial-kicker">Reseña para</p>
                <h3 className="tf-testimonial-name">{activeReview.name}</h3>
                <p className="tf-testimonial-affiliation">{activeReview.affiliation}</p>
                <blockquote className="tf-testimonial-quote">"{activeReview.quote}"</blockquote>
                {activeReview.reviewerName && (
                  <p className="tf-testimonial-reviewer">Cliente: <span>{activeReview.reviewerName}</span></p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="tf-testimonial-nav">
            <button type="button" onClick={handlePrev} aria-label="Reseña anterior">
              <ArrowLeft aria-hidden="true" />
            </button>
            <button type="button" onClick={handleNext} aria-label="Siguiente reseña">
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
