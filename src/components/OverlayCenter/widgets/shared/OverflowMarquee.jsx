import {useEffect,useRef,useState} from 'react';
const visibilityListeners=new Map();
let visibilityObserver;
function watchVisibility(element,listener) {
 if(!visibilityObserver)visibilityObserver=new IntersectionObserver(entries=>{for(const entry of entries)visibilityListeners.get(entry.target)?.(entry.isIntersecting)});
 visibilityListeners.set(element,listener);visibilityObserver.observe(element);
 return()=>{visibilityObserver.unobserve(element);visibilityListeners.delete(element);if(!visibilityListeners.size){visibilityObserver.disconnect();visibilityObserver=null}};
}
export default function OverflowMarquee({children}) {
 const root=useRef(null),[distance,setDistance]=useState(0),[visible,setVisible]=useState(true);
 useEffect(()=>{const element=root.current;if(!element)return;const measure=()=>{const text=element.firstElementChild;setDistance(text.scrollWidth>element.clientWidth+1?text.scrollWidth+24:0)};const observer=new ResizeObserver(measure);observer.observe(element);observer.observe(element.firstElementChild);const unwatch=watchVisibility(element,setVisible);measure();return()=>{observer.disconnect();unwatch()}},[children]);
 return <span className="sr-title-marquee" ref={root} data-moving={distance>0&&visible} style={{'--sr-marquee-distance':`${distance}px`,'--sr-marquee-duration':`${Math.max(7,distance/28)}s`}}><span>{children}</span>{distance>0&&<span aria-hidden="true">{children}</span>}</span>;
}
