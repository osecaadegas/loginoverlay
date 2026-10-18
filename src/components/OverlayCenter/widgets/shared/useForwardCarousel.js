import {useEffect} from 'react';

// Render the first visible items once more after the real queue. Crossing into
// that identical tail allows an instant reset without animating backwards.
export default function useForwardCarousel(ref,{count,visible=1,axis='y',enabled=true,interval=3500,activeIndex=-1,centerActive=false}) {
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const horizontal=axis==='x',position=()=>horizontal?el.scrollLeft:el.scrollTop;
  const offset=node=>horizontal?node.offsetLeft:node.offsetTop;
  const move=(value,smooth=false)=>el.scrollTo({[horizontal?'left':'top']:value,behavior:smooth&&!media.matches?'smooth':'instant'});
  const items=()=>[...el.querySelectorAll(':scope > [data-carousel-item]')];
  const origin=()=>offset(items()[0]||el);
  const cycle=()=>{const rows=items();return rows[count]?offset(rows[count])-origin():0};
  let paused=false;
  const wrap=()=>{const width=cycle();if(width>0&&position()>=width-2)move(Math.max(0,position()-width))};
  const follow=()=>{const rows=items(),current=rows[activeIndex];if(!current)return;const target=offset(current)-(centerActive?0:origin()),extent=horizontal?el.clientWidth:el.clientHeight,size=horizontal?current.clientWidth:current.clientHeight;if(centerActive||target<position()||target+size>position()+extent)move(Math.max(0,target-(extent-size)/2),el.dataset.carouselReady==='true'&&target>=position());el.dataset.carouselReady='true'};
  follow();
  const observer=new ResizeObserver(follow);observer.observe(el);
  const enter=()=>{paused=true},leave=()=>{paused=false};
  el.addEventListener('scroll',wrap,{passive:true});el.addEventListener('pointerenter',enter);el.addEventListener('pointerleave',leave);el.addEventListener('focusin',enter);el.addEventListener('focusout',leave);
  const timer=enabled&&count>visible?window.setInterval(()=>{
   if(paused||document.hidden||media.matches)return;
   wrap();const rows=items(),next=rows.find(row=>offset(row)-origin()>position()+2);
   if(next)move(offset(next)-origin(),true);
  },Math.max(2000,Math.min(15000,Number(interval)||3500))):null;
  const reduce=()=>{if(media.matches){move(position());wrap()}};media.addEventListener('change',reduce);
  return()=>{clearInterval(timer);observer.disconnect();media.removeEventListener('change',reduce);el.removeEventListener('scroll',wrap);el.removeEventListener('pointerenter',enter);el.removeEventListener('pointerleave',leave);el.removeEventListener('focusin',enter);el.removeEventListener('focusout',leave)};
 },[ref,count,visible,axis,enabled,interval,activeIndex,centerActive]);
}
