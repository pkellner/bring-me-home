// API Response Types - Safe for client-side imports
// These types mirror the data structures from cache modules but don't import any server-side code

export interface TownPagePerson {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  lastSeenDate: Date | null;
  dateOfBirth: Date | null;
  story: string | null;
  createdAt: Date;
  detentionCenterId: string | null;
  detentionCenter: {
    id: string;
    name: string;
    city: string;
    state: string;
  } | null;
  _count: {
    comments: number;
  };
  imageUrl: string | null;
}

export interface TownPageData {
  id: string;
  name: string;
  slug: string;
  state: string;
  layout: {
    id: string;
    name: string;
  } | null;
  theme: {
    id: string;
    name: string;
  } | null;
  persons: TownPagePerson[];
}

export interface HomepageTown {
  id: string;
  name: string;
  slug: string;
  state: string;
  _count: {
    persons: number;
  };
}

export interface HomepagePerson {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  lastSeenDate: Date | null;
  town: {
    name: string;
    slug: string;
    state: string;
  };
  imageUrl: string | null;
}

export interface HomepageData {
  towns: HomepageTown[];
  recentPersons: HomepagePerson[];
  totalDetained: number;
}