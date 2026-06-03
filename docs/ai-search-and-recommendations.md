# AI Search and Recommendation System

This document explains how the Jewellz Realty search and AI recommendation system works.

## Overview

The system uses a hybrid approach:

1. **Natural-language search parsing**
2. **AI intent extraction**
3. **AI embeddings**
4. **Supabase vector search**
5. **Factual reranking**
6. **Fallback recommendations**

This makes the system more useful than simple keyword search while still keeping factual filters like price, category, bedrooms, and location reliable.

## Search Flow

When a user searches from the navbar or project list:

```txt
User search
→ Project List receives search text
→ Search intent is extracted
→ Matching properties are filtered
→ Results are sorted by intent
→ If no direct matches exist, AI recommendations are shown
```

Example:

```txt
cheap houses in Lipa
```

The system understands:

```json
{
  "preferredTypes": ["House"],
  "budgetIntent": "affordable",
  "locationQuery": "lipa",
  "sort": "price_asc"
}
```

So it shows house listings in Lipa and sorts them from lowest to highest price.

## AI Intent Extraction

The shared intent logic is in:

```txt
lib/ai/search-intent.ts
```

It extracts structured intent:

```ts
type PropertySearchIntent = {
  propertyIntent: "residential" | "land" | "agricultural" | "memorial" | "any";
  preferredTypes: string[];
  budgetIntent: "affordable" | "luxury" | "any";
  nearbyNeed: "Education" | "Health" | "Food" | "Culture" | null;
  familySuitable: boolean;
  sort: "price_asc" | "price_desc" | "relevance";
  locationQuery: string;
  confidence: number;
};
```

There are two levels:

### Basic Intent

Used in the project list UI for fast filtering and sorting.

```txt
extractBasicSearchIntent()
```

### Semantic Intent

Used by the recommendation API. It uses AI embeddings to compare the search against intent examples such as:

```txt
affordable property
residential home
family suitable
near school
luxury property
investment lot
memorial property
```

```txt
extractSemanticSearchIntent()
```

## AI Embeddings

Embeddings are generated using:

```txt
lib/ai/property-embeddings.ts
```

The embedding model converts text into a 384-dimensional meaning vector.

Example user search:

```txt
Find me a cheap place for a small family in Lipa
```

The AI embedding captures meaning like:

```txt
affordable + residential + family-suitable + Lipa
```

Each property also has an embedding based on its `embedding_text`.

## Property Embedding Text

Supabase stores AI-readable context in:

```txt
properties.embedding_text
```

This includes:

- title
- category
- status
- address
- city
- province
- price
- bedrooms
- bathrooms
- floor area
- lot area
- parking
- description
- key features
- amenities
- nearby landmarks

Example:

```txt
Title: Sample House and Lot |
Type: house |
Location: Lipa City, Batangas |
Price PHP: 6800000 |
Bedrooms: 3 |
Description: A family-ready home...
```

The generated vector is stored in:

```txt
properties.embedding
```

## Automatic Embeddings

When a property is added or edited:

```txt
CMS saves property
→ SQL trigger updates embedding_text
→ Supabase webhook calls Edge Function
→ Edge Function generates embedding
→ properties.embedding is updated
```

Related files:

```txt
supabase/property-ai-recommendations.sql
supabase/property-ai-webhook-trigger.sql
supabase/functions/generate-property-embedding/index.ts
```

## Nearby Places Context

The property detail page already shows:

```txt
What's nearby
Education
Health
Food
Culture
```

The recommendation system can also use this context.

Nearby places are fetched from OpenStreetMap/Overpass and cached in Supabase:

```txt
property_nearby_places
```

Related files:

```txt
supabase/property-nearby-cache.sql
app/api/admin/property-nearby-cache/route.ts
lib/nearby-places.ts
```

This lets searches like:

```txt
affordable house near school
```

boost properties with cached nearby Education places.

## Recommendation Flow

If the normal search returns no exact matches:

```txt
User search
→ /api/recommendations
→ AI extracts intent
→ User search becomes an embedding
→ Supabase pgvector finds semantically similar properties
→ System reranks using facts
→ Recommendations are displayed
```

The recommendation API lives here:

```txt
app/api/recommendations/route.ts
```

## Factual Reranking

After vector search, the system reranks using facts:

| Intent | Ranking Behavior |
| --- | --- |
| affordable / cheap | cheaper properties rank higher |
| luxury / premium | higher-priced properties rank higher |
| family / small family | properties with bedrooms rank higher |
| house / home | House and residential types rank higher |
| condo / unit | Condo types rank higher |
| near school | properties near Education places rank higher |
| near hospital | properties near Health places rank higher |

This is important because AI understands meaning, but the app enforces facts.

## Fallbacks

If vector search fails:

1. OpenRouter AI ranking can be used.
2. Local smart fallback can be used.

This prevents the page from showing nothing when external services are slow or unavailable.

## Example Searches

### Direct Match

```txt
cheap houses in Lipa
```

Expected behavior:

```txt
House listings in Lipa, sorted lowest to highest price.
```

### Family Intent

```txt
Find me a cheap place for a small family in Lipa
```

Expected behavior:

```txt
Residential properties such as houses or condos, preferably with bedrooms, sorted with affordability in mind.
```

### Nearby Intent

```txt
affordable house near school
```

Expected behavior:

```txt
Affordable house listings boosted by nearby Education places.
```

### Premium Intent

```txt
premium condo in Lipa
```

Expected behavior:

```txt
Condo listings sorted toward higher-end/premium options.
```

## Simple Explanation

In simple terms:

```txt
AI understands what the user means.
Supabase finds similar property vectors.
The app sorts using real facts like price, type, bedrooms, and nearby places.
```

This is a real AI recommendation system because AI-generated semantic embeddings power the search and recommendation matching.
