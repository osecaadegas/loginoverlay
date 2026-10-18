import {useMemo} from 'react';
import {applyPreviewWidgetSamples} from '../../appearance/previewWidgetSamples';
import useSlotRequestsData from './shared/useSlotRequestsData';
import ImageCards from './ImageCards';
export default function SlotRequestsWidget({config={},userId,publicOverlayId,runtime,previewOnly}) {
 const effective=useMemo(()=>previewOnly?applyPreviewWidgetSamples([{widget_type:'slot_requests',config}])[0].config:config,[previewOnly,config]);
 const {requests}=useSlotRequestsData({config:effective,userId,publicOverlayId,runtime,enabled:config.showSlotRequests!==false});
 if(config.showSlotRequests===false)return null;
 return <ImageCards config={config} requests={requests} compact={config.displayStyle==='v1_minimal'}/>;
}
