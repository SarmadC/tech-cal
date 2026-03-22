declare module 'topojson-client' {
  import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

  export interface TopologyObject {
    type: string;
    arcs?: unknown[];
    geometries?: unknown[];
    [key: string]: unknown;
  }

  export interface Topology {
    type: 'Topology';
    objects: Record<string, TopologyObject>;
    arcs: unknown[];
    bbox?: number[];
    transform?: {
      scale: [number, number];
      translate: [number, number];
    };
    [key: string]: unknown;
  }

  export function feature<P extends GeoJsonProperties = GeoJsonProperties>(
    topology: Topology,
    object: TopologyObject,
  ): Feature<Geometry, P> | FeatureCollection<Geometry, P>;
}
