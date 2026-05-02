import { StyleSheet, View } from 'react-native';

const BOX_BG = '#1a2233';
const BOX_BORDER = '#333c4d';
const GOLD = '#e0b13c';

/** Tüm ölçüler bu tuval üzerinde (kayma olmasın) */
const W = 80;
const H = 80;

const L_INSET = 8;
const L_ARM = 12;
const L_THICK = 2;

const INNER_LEFT = 22;
const INNER_TOP = 22;
const QUAD = 16;
const MID_GAP = 4;

const RING_SIZE = 12;
const RING_BORDER = 2;
const RING_OFF = Math.floor((QUAD - RING_SIZE) / 2);

const PIX = 3;
const PIX_GAP = 1;
const PIX_GRID = PIX * 3 + PIX_GAP * 2;
const PIX_OFF = Math.floor((QUAD - PIX_GRID) / 2);

const X_PATTERN = [
  [1, 0, 1],
  [0, 1, 0],
  [1, 0, 1],
];

export default function PixelQrMark({ boxSize = 80 }) {
  return (
    <View style={[styles.box, { width: boxSize, height: boxSize }]}>
      <View style={styles.artboard}>
        <View style={[styles.lH, { top: L_INSET, left: L_INSET, width: L_ARM, height: L_THICK }]} />
        <View style={[styles.lV, { top: L_INSET, left: L_INSET, width: L_THICK, height: L_ARM }]} />

        <View style={[styles.lH, { top: L_INSET, right: L_INSET, width: L_ARM, height: L_THICK }]} />
        <View style={[styles.lV, { top: L_INSET, right: L_INSET, width: L_THICK, height: L_ARM }]} />

        <View style={[styles.lH, { bottom: L_INSET, left: L_INSET, width: L_ARM, height: L_THICK }]} />
        <View style={[styles.lV, { bottom: L_INSET, left: L_INSET, width: L_THICK, height: L_ARM }]} />

        <View style={[styles.lH, { bottom: L_INSET, right: L_INSET, width: L_ARM, height: L_THICK }]} />
        <View style={[styles.lV, { bottom: L_INSET, right: L_INSET, width: L_THICK, height: L_ARM }]} />

        <View
          style={[
            styles.ring,
            {
              left: INNER_LEFT + RING_OFF,
              top: INNER_TOP + RING_OFF,
              width: RING_SIZE,
              height: RING_SIZE,
              borderWidth: RING_BORDER,
            },
          ]}
        />
        <View
          style={[
            styles.ring,
            {
              left: INNER_LEFT + QUAD + MID_GAP + RING_OFF,
              top: INNER_TOP + RING_OFF,
              width: RING_SIZE,
              height: RING_SIZE,
              borderWidth: RING_BORDER,
            },
          ]}
        />
        <View
          style={[
            styles.ring,
            {
              left: INNER_LEFT + RING_OFF,
              top: INNER_TOP + QUAD + MID_GAP + RING_OFF,
              width: RING_SIZE,
              height: RING_SIZE,
              borderWidth: RING_BORDER,
            },
          ]}
        />

        {X_PATTERN.map((row, ri) =>
          row.map((on, ci) =>
            on ? (
              <View
                key={`${ri}-${ci}`}
                style={[
                  styles.pixel,
                  {
                    left:
                      INNER_LEFT +
                      QUAD +
                      MID_GAP +
                      PIX_OFF +
                      ci * (PIX + PIX_GAP),
                    top:
                      INNER_TOP +
                      QUAD +
                      MID_GAP +
                      PIX_OFF +
                      ri * (PIX + PIX_GAP),
                    width: PIX,
                    height: PIX,
                  },
                ]}
              />
            ) : null
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: BOX_BG,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BOX_BORDER,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artboard: {
    width: W,
    height: H,
    position: 'relative',
  },
  lH: {
    position: 'absolute',
    backgroundColor: GOLD,
  },
  lV: {
    position: 'absolute',
    backgroundColor: GOLD,
  },
  ring: {
    position: 'absolute',
    borderColor: GOLD,
    backgroundColor: 'transparent',
    borderRadius: 1,
  },
  pixel: {
    position: 'absolute',
    backgroundColor: GOLD,
  },
});
