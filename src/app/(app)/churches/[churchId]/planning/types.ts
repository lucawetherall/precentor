export interface CellDisplay {
  displayText: string;
  refId?: string | null;
  isUnmatched?: boolean;
}

export interface ReadingsDisplay {
  ref: string;
  text?: string | null;
}

export interface PlanningRow {
  kind: "real" | "ghost";
  ghostId?: string;
  serviceId?: string;
  date: string;
  serviceType: string;
  time: string | null;
  liturgicalDayId?: string;
  updatedAt?: string;
  cells: {
    introit: CellDisplay;
    hymns: CellDisplay;
    setting: CellDisplay;
    psalm: CellDisplay;
    chant: CellDisplay;
    respAccl: CellDisplay;
    anthem: CellDisplay;
    voluntary: CellDisplay;
    info: CellDisplay;
  };
  readings: ReadingsDisplay[];
}

export type GridColumn =
  | "introit"
  | "hymns"
  | "setting"
  | "psalm"
  | "chant"
  | "respAccl"
  | "anthem"
  | "voluntary"
  | "info";
