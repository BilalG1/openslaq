import fc from "fast-check";
import { buildDestinationItems } from "../destination-items";
import type { Channel } from "@openslaq/shared";
import type {
  DmConversation,
  GroupDmConversation,
} from "@openslaq/client-core";

function makeChannel(id: string, name: string, type: "public" | "private"): Channel {
  return {
    id,
    name,
    type,
    workspaceId: "ws1",
    createdBy: "u1",
    createdAt: new Date().toISOString(),
    topic: null,
    description: null,
    memberCount: 1,
  } as unknown as Channel;
}

function makeDm(id: string, displayName: string): DmConversation {
  return {
    channel: { id, name: "", type: "dm" } as unknown as Channel,
    otherUser: { id: "u-other", displayName, avatarUrl: null },
  } as unknown as DmConversation;
}

function makeGroupDm(
  id: string,
  members: string[],
  channelDisplayName?: string,
): GroupDmConversation {
  return {
    channel: {
      id,
      name: "",
      type: "group_dm",
      displayName: channelDisplayName ?? null,
    } as unknown as Channel,
    members: members.map((name) => ({
      id: "u",
      displayName: name,
      avatarUrl: null,
    })),
  } as unknown as GroupDmConversation;
}

const nameArb = fc.stringMatching(/^[a-z]{1,15}$/);
const typeArb = fc.constantFrom("public" as const, "private" as const);

describe("buildDestinationItems property tests", () => {
  test("output length equals sum of input lengths", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(nameArb, nameArb, typeArb), { maxLength: 10 }),
        fc.array(fc.tuple(nameArb, nameArb), { maxLength: 10 }),
        fc.array(
          fc.tuple(nameArb, fc.array(nameArb, { minLength: 1, maxLength: 5 })),
          { maxLength: 10 },
        ),
        (channelTuples, dmTuples, groupTuples) => {
          const channels = channelTuples.map(([id, name, type]) =>
            makeChannel(id, name, type),
          );
          const dms = dmTuples.map(([id, name]) => makeDm(id, name));
          const groupDms = groupTuples.map(([id, members]) =>
            makeGroupDm(id, members),
          );
          const result = buildDestinationItems(channels, dms, groupDms);
          expect(result.length).toBe(
            channels.length + dms.length + groupDms.length,
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  test("channels map to public or private, never dm", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(nameArb, nameArb, typeArb), {
          minLength: 1,
          maxLength: 10,
        }),
        (channelTuples) => {
          const channels = channelTuples.map(([id, name, type]) =>
            makeChannel(id, name, type),
          );
          const result = buildDestinationItems(channels, []);
          for (const item of result) {
            expect(["public", "private"]).toContain(item.type);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  test("DMs always map to type dm", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(nameArb, nameArb), { minLength: 1, maxLength: 10 }),
        (dmTuples) => {
          const dms = dmTuples.map(([id, name]) => makeDm(id, name));
          const result = buildDestinationItems([], dms);
          for (const item of result) {
            expect(item.type).toBe("dm");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  test("all output ids are present in input ids", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(nameArb, nameArb, typeArb), { maxLength: 5 }),
        fc.array(fc.tuple(nameArb, nameArb), { maxLength: 5 }),
        (channelTuples, dmTuples) => {
          const channels = channelTuples.map(([id, name, type]) =>
            makeChannel(id, name, type),
          );
          const dms = dmTuples.map(([id, name]) => makeDm(id, name));
          const inputIds = new Set([
            ...channels.map((c) => c.id),
            ...dms.map((d) => d.channel.id),
          ]);
          const result = buildDestinationItems(channels, dms);
          for (const item of result) {
            expect(inputIds.has(item.id as any)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  test("group DM without displayName falls back to joined member names", () => {
    fc.assert(
      fc.property(
        nameArb,
        fc.array(nameArb, { minLength: 2, maxLength: 5 }),
        (id, memberNames) => {
          const groupDm = makeGroupDm(id, memberNames);
          const result = buildDestinationItems([], [], [groupDm]);
          expect(result[0]!.name).toBe(memberNames.join(", "));
        },
      ),
      { numRuns: 100 },
    );
  });

  test("group DM with displayName uses it instead of member names", () => {
    fc.assert(
      fc.property(
        nameArb,
        fc.array(nameArb, { minLength: 2, maxLength: 5 }),
        nameArb,
        (id, memberNames, displayName) => {
          const groupDm = makeGroupDm(id, memberNames, displayName);
          const result = buildDestinationItems([], [], [groupDm]);
          expect(result[0]!.name).toBe(displayName);
        },
      ),
      { numRuns: 100 },
    );
  });
});
