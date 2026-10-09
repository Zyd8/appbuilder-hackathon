import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { readWidgetSnapshot } from '../widget-snapshot';
import { renderAndroidWidget } from './render-widget';

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE' || widgetAction === 'WIDGET_RESIZED') {
    const widget = renderAndroidWidget(widgetInfo.widgetName, readWidgetSnapshot(), widgetInfo);
    if (widget) renderWidget(widget);
  }
}
