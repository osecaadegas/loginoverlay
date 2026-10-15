import React from "react";
import FreezeShatterWidget from "../freeze-shatter/FreezeShatterWidget";
import MoneyExplosionWidget from "../money-explosion/MoneyExplosionWidget";
import { activeCameraStyleConfig, sanitizeCameraConfig } from "./cameraConfig";

export default function CameraWidget(props) {
  const normalized = sanitizeCameraConfig(props.config);
  const sharedProps = { ...props, config: activeCameraStyleConfig(normalized) };
  return normalized.displayStyle === "money_explosion"
    ? <MoneyExplosionWidget {...sharedProps} />
    : <FreezeShatterWidget {...sharedProps} />;
}
