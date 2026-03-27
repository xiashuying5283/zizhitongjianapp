const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

// 类型定义
export interface Character {
  id: number;
  name: string;
  title: string | null;
  era: string | null;
  birth_year: string | null;
  death_year: string | null;
  summary: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CharacterRelation {
  id: number;
  relation_type: string;
  description: string | null;
  related_character: {
    id: number;
    name: string;
    title: string | null;
    era: string | null;
  };
}

export interface ReverseRelation {
  id: number;
  relation_type: string;
  description: string | null;
  character: {
    id: number;
    name: string;
    title: string | null;
    era: string | null;
  };
}

export interface CharacterEvent {
  id: number;
  year: string;
  event: string;
  sort_order: number;
}

export interface CharacterDetail extends Character {
  relations: CharacterRelation[];
  reverseRelations: ReverseRelation[];
  events: CharacterEvent[];
}

export interface Era {
  name: string;
  count: number;
}

export interface GraphNode {
  id: number;
  name: string;
  title: string | null;
  era: string | null;
}

export interface GraphEdge {
  id: number;
  character_id: number;
  related_character_id: number;
  relation_type: string;
  description: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CharactersResponse {
  success: boolean;
  data: {
    characters: Character[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 获取朝代列表
export async function getEras(): Promise<{ success: boolean; data: Era[] }> {
  const response = await fetch(`${BASE_URL}/api/v1/characters/eras`);
  return response.json();
}

// 获取人物列表
export async function getCharacters(params?: {
  era?: string;
  name?: string;
  page?: number;
  limit?: number;
}): Promise<CharactersResponse> {
  const queryParams = new URLSearchParams();
  if (params?.era) queryParams.set('era', params.era);
  if (params?.name) queryParams.set('name', params.name);
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const response = await fetch(
    `${BASE_URL}/api/v1/characters?${queryParams.toString()}`
  );
  return response.json();
}

// 获取人物详情
export async function getCharacter(id: number): Promise<{ success: boolean; data: CharacterDetail }> {
  const response = await fetch(`${BASE_URL}/api/v1/characters/${id}`);
  return response.json();
}

// 获取人物关系
export async function getCharacterRelations(id: number): Promise<{
  success: boolean;
  data: {
    outgoing: CharacterRelation[];
    incoming: ReverseRelation[];
  };
}> {
  const response = await fetch(`${BASE_URL}/api/v1/characters/${id}/relations`);
  return response.json();
}

// 获取人物事件
export async function getCharacterEvents(id: number): Promise<{ success: boolean; data: CharacterEvent[] }> {
  const response = await fetch(`${BASE_URL}/api/v1/characters/${id}/events`);
  return response.json();
}

// 获取人物关系图谱数据
export async function getCharacterGraph(params?: {
  era?: string;
  characterId?: number;
}): Promise<{ success: boolean; data: GraphData }> {
  const queryParams = new URLSearchParams();
  if (params?.era) queryParams.set('era', params.era);
  if (params?.characterId) queryParams.set('characterId', params.characterId.toString());

  const response = await fetch(
    `${BASE_URL}/api/v1/characters/graph?${queryParams.toString()}`
  );
  return response.json();
}
