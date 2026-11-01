import { Candle, VolumeProfileSummary, VolumeProfileBucket } from '../types/grid';

/**
 * Calculates Volume Profile (POC, VAH, VAL, HVN) over a set of candles
 */
export function calculateVolumeProfile(candles: Candle[], numBuckets: number = 120): VolumeProfileSummary {
  if (!candles || candles.length === 0) {
    return {
      poc: 0,
      vah: 0,
      val: 0,
      totalVolume: 0,
      buckets: [],
      hvnLevels: [],
      lvnLevels: []
    };
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let totalVolume = 0;

  candles.forEach(c => {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
    totalVolume += c.volume;
  });

  if (minPrice === maxPrice) {
    minPrice *= 0.99;
    maxPrice *= 1.01;
  }

  const bucketSize = (maxPrice - minPrice) / numBuckets;
  const bucketVolumes = new Array(numBuckets).fill(0);

  // Distribute candle volume into price buckets proportionally
  candles.forEach(c => {
    const candleMid = (c.open + c.close + c.high + c.low) / 4;
    const bucketIdx = Math.min(
      numBuckets - 1,
      Math.max(0, Math.floor((candleMid - minPrice) / bucketSize))
    );
    bucketVolumes[bucketIdx] += c.volume;
  });

  // Find POC (Point of Control)
  let maxVol = -1;
  let pocIdx = 0;
  for (let i = 0; i < numBuckets; i++) {
    if (bucketVolumes[i] > maxVol) {
      maxVol = bucketVolumes[i];
      pocIdx = i;
    }
  }

  const pocPrice = minPrice + (pocIdx + 0.5) * bucketSize;

  // Calculate Value Area (70% of total volume starting from POC)
  const targetValueVolume = totalVolume * 0.7;
  let accumulatedVol = maxVol;
  let upIdx = pocIdx;
  let downIdx = pocIdx;

  while (accumulatedVol < targetValueVolume && (upIdx < numBuckets - 1 || downIdx > 0)) {
    const nextUpVol = upIdx < numBuckets - 1 ? bucketVolumes[upIdx + 1] : -1;
    const nextDownVol = downIdx > 0 ? bucketVolumes[downIdx - 1] : -1;

    if (nextUpVol >= nextDownVol && upIdx < numBuckets - 1) {
      upIdx++;
      accumulatedVol += bucketVolumes[upIdx];
    } else if (downIdx > 0) {
      downIdx--;
      accumulatedVol += bucketVolumes[downIdx];
    } else if (upIdx < numBuckets - 1) {
      upIdx++;
      accumulatedVol += bucketVolumes[upIdx];
    }
  }

  const valPrice = minPrice + (downIdx + 0.5) * bucketSize;
  const vahPrice = minPrice + (upIdx + 0.5) * bucketSize;

  // Identify High Volume Nodes (HVNs) - Local maxima in bucket volumes
  const hvnLevels: number[] = [];
  const lvnLevels: number[] = [];

  for (let i = 1; i < numBuckets - 1; i++) {
    const current = bucketVolumes[i];
    const prev = bucketVolumes[i - 1];
    const next = bucketVolumes[i + 1];

    if (current > prev && current > next && current > maxVol * 0.25) {
      hvnLevels.push(minPrice + (i + 0.5) * bucketSize);
    } else if (current < prev && current < next) {
      lvnLevels.push(minPrice + (i + 0.5) * bucketSize);
    }
  }

  const buckets: VolumeProfileBucket[] = bucketVolumes.map((vol, idx) => {
    const priceLevel = minPrice + (idx + 0.5) * bucketSize;
    return {
      priceLevel,
      volume: vol,
      isPOC: idx === pocIdx,
      isHVN: hvnLevels.some(hvn => Math.abs(hvn - priceLevel) < bucketSize * 0.6),
      inValueArea: idx >= downIdx && idx <= upIdx
    };
  });

  return {
    poc: pocPrice,
    vah: vahPrice,
    val: valPrice,
    totalVolume,
    buckets,
    hvnLevels,
    lvnLevels
  };
}
