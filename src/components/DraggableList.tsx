import { useRef, useState, type ReactNode } from 'react';
import { Animated, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { colors } from '../theme';

interface Props<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  /** handle: 드래그 손잡이 요소. 카드 안 원하는 위치에 넣는다 */
  renderItem: (item: T, index: number, handle: ReactNode, dragging: boolean) => ReactNode;
  onReorder: (from: number, to: number) => void;
  /** 드래그 중에는 바깥 ScrollView 스크롤을 막아야 제스처가 끊기지 않는다 */
  onDragActiveChange?: (active: boolean) => void;
  gap?: number;
}

interface DragState {
  from: number;
  to: number;
  /** 끌고 있는 항목 높이 + 간격 (다른 항목이 비켜나는 거리) */
  shift: number;
}

/**
 * 손잡이(≡)를 잡고 위아래로 끌어 순서를 바꾸는 리스트.
 * react-native 기본 Gesture Responder만 사용해 Expo Go·웹 모두에서 동작한다.
 */
export function DraggableList<T>({
  items,
  keyExtractor,
  renderItem,
  onReorder,
  onDragActiveChange,
  gap = 12,
}: Props<T>) {
  const heights = useRef<number[]>([]);
  const startY = useRef(0);
  const [drag, setDragState] = useState<DragState | null>(null);
  // 이벤트 핸들러에서 최신 값을 읽기 위한 사본
  const dragRef = useRef<DragState | null>(null);
  const setDrag = (d: DragState | null) => {
    dragRef.current = d;
    setDragState(d);
  };
  const [dy] = useState(() => new Animated.Value(0));

  const targetIndex = (from: number, offset: number) => {
    let to = from;
    let acc = 0;
    const step = offset > 0 ? 1 : -1;
    for (let i = from + step; i >= 0 && i < items.length; i += step) {
      const h = (heights.current[i] ?? 0) + gap;
      if (Math.abs(offset) > acc + h / 2) {
        to = i;
        acc += h;
      } else break;
    }
    return to;
  };

  const handlers = (index: number) => ({
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      startY.current = e.nativeEvent.pageY;
      dy.setValue(0);
      setDrag({ from: index, to: index, shift: (heights.current[index] ?? 0) + gap });
      onDragActiveChange?.(true);
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const offset = e.nativeEvent.pageY - startY.current;
      dy.setValue(offset);
      const to = targetIndex(index, offset);
      const d = dragRef.current;
      if (d && d.to !== to) setDrag({ ...d, to });
    },
    onResponderRelease: () => finish(true),
    onResponderTerminate: () => finish(false),
  });

  const finish = (commit: boolean) => {
    const d = dragRef.current;
    setDrag(null);
    if (d && commit && d.to !== d.from) onReorder(d.from, d.to);
    dy.setValue(0);
    onDragActiveChange?.(false);
  };

  const shiftFor = (i: number) => {
    if (!drag || i === drag.from) return 0;
    if (drag.from < i && i <= drag.to) return -drag.shift;
    if (drag.to <= i && i < drag.from) return drag.shift;
    return 0;
  };

  return (
    <View style={{ gap }}>
      {items.map((item, i) => {
        const active = drag?.from === i;
        const handle = (
          <View
            {...handlers(i)}
            hitSlop={8}
            accessibilityLabel="끌어서 순서 바꾸기"
            style={{ paddingHorizontal: 6, paddingVertical: 4, cursor: 'grab' } as object}
          >
            <Text style={{ fontSize: 20, color: colors.subText }}>≡</Text>
          </View>
        );
        return (
          <Animated.View
            key={keyExtractor(item)}
            onLayout={(e: LayoutChangeEvent) => {
              heights.current[i] = e.nativeEvent.layout.height;
            }}
            style={{
              zIndex: active ? 10 : 0,
              transform: [{ translateY: active ? dy : shiftFor(i) }],
              opacity: active ? 0.9 : 1,
            }}
          >
            {renderItem(item, i, handle, active)}
          </Animated.View>
        );
      })}
    </View>
  );
}
