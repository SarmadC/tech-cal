import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type {
    MobileCommunityCirclePage,
    MobileCommunityHome,
    MobileCommunityPostPage,
    MobilePublicProfile,
    MobileSpeakerDetail,
} from "@kurecal/domain";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import CommunityScreen from "../app/(tabs)/community";
import CommunityCircleScreen from "../app/community/[slug]";
import CommunityPostScreen from "../app/community/post/[postId]";
import PublicProfileScreen from "../app/profile/[username]";
import SpeakerScreen from "../app/speaker/[id]";
import { renderWithProviders } from "./renderWithProviders";

const mockRouterPush: any = jest.fn();
const mockRouterBack: any = jest.fn();
const mockUseLocalSearchParams: any = jest.fn();
const mockOpenURL: any = jest
    .spyOn(Linking, "openURL")
    .mockResolvedValue(undefined);
const mockMobileApi: any = {
    getCommunityHome: jest.fn(),
    getCommunityCircle: jest.fn(),
    getCommunityPost: jest.fn(),
    getPublicProfile: jest.fn(),
    getSpeaker: jest.fn(),
    getFollowStatus: jest.fn(),
    followUser: jest.fn(),
    unfollowUser: jest.fn(),
    joinCommunityCircle: jest.fn(),
    leaveCommunityCircle: jest.fn(),
    createCommunityPost: jest.fn(),
    createCommunityComment: jest.fn(),
    submitVote: jest.fn(),
};

jest.mock("expo-router", () => ({
    router: {
        push: (...args: unknown[]) => mockRouterPush(...args),
        back: (...args: unknown[]) => mockRouterBack(...args),
    },
    useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock("@/lib/mobileApi", () => ({
    getMobileApiClient: () => mockMobileApi,
}));

function createCommunityHome(
    overrides: Partial<MobileCommunityHome> = {},
): MobileCommunityHome {
    return {
        summary: {
            trackedUpcomingCount: 2,
            visibleOpportunityCount: 2,
            followUpCount: 1,
            attendanceVisibilityEnabled: true,
        },
        upcomingMoments: [
            {
                id: "11111111-1111-4111-8111-111111111111",
                slug: "design-review-week",
                title: "Design Review Week",
                startTime: "2026-04-02T18:00:00.000Z",
                imageUrl: "https://example.com/design-review-week.png",
                location: "Remote",
                format: "virtual",
                viewerContext: "attending",
                recentTrackerCount: 3,
                totalAttendeeCount: 12,
                visibleAttendeeCount: 4,
                networkAttendingCount: 2,
                relationshipAttendeeCount: 1,
                primaryReason: "Someone you already know is already visible here.",
                whyNow:
                    "This is the clearest upcoming event where your network already has faces attached to it.",
                newVisibleAttendeeCount: 1,
                recommendedAction: "expand_people",
                attendeePreview: [
                    {
                        id: "99999999-9999-4999-8999-999999999999",
                        fullName: "Jordan",
                        username: "jordan",
                        avatarUrl: null,
                        isInNetwork: false,
                        followsViewer: false,
                        isMutualFollow: false,
                    },
                ],
                speakerPreview: [
                    {
                        id: "speaker-1",
                        name: "Dana Scully",
                        title: "AI Research Lead",
                        company: "Signal Labs",
                        photoUrl: null,
                        linkedinUrl: "https://linkedin.com/in/dana",
                        twitterUrl: null,
                        websiteUrl: null,
                        matchedProfileUsername: null,
                    },
                    {
                        id: "speaker-2",
                        name: "Alex Kim",
                        title: "Founder",
                        company: "Proto",
                        photoUrl: null,
                        linkedinUrl: null,
                        twitterUrl: null,
                        websiteUrl: null,
                        matchedProfileUsername: null,
                    },
                ],
            },
            {
                id: "55555555-5555-4555-8555-555555555555",
                slug: "platform-clarity-summit",
                title: "Platform Clarity Summit",
                startTime: "2026-05-05T16:00:00.000Z",
                imageUrl: "https://example.com/platform-clarity-summit.png",
                location: "Seattle, WA",
                format: "hybrid",
                viewerContext: "saved",
                recentTrackerCount: 2,
                totalAttendeeCount: 8,
                visibleAttendeeCount: 1,
                networkAttendingCount: 0,
                relationshipAttendeeCount: 0,
                primaryReason: "Public attendee visibility is starting to build here.",
                whyNow:
                    "This one is worth saving while attendee visibility and speaker context continue to build.",
                newVisibleAttendeeCount: 0,
                recommendedAction: "open_event",
                attendeePreview: [
                    {
                        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                        fullName: "Casey Rivera",
                        username: "casey",
                        avatarUrl: null,
                        isInNetwork: false,
                        followsViewer: false,
                        isMutualFollow: false,
                    },
                ],
                speakerPreview: [],
            },
        ],
        peopleToMeet: [
            {
                id: "22222222-2222-4222-8222-222222222222",
                fullName: "Ada Lovelace",
                username: "ada",
                avatarUrl: null,
                headline: "Staff engineer",
                location: "San Francisco, CA",
                currentRole: "Staff engineer",
                industry: "Developer tools",
                companySize: "medium",
                mutualConnectionsCount: 12,
                isInNetwork: false,
                followsViewer: true,
                isMutualFollow: false,
                sharedUpcomingEventCount: 2,
                soonestSharedEventStartTime: "2026-04-02T18:00:00.000Z",
                sharedEvents: [
                    {
                        id: "11111111-1111-4111-8111-111111111111",
                        slug: "design-review-week",
                        title: "Design Review Week",
                        startTime: "2026-04-02T18:00:00.000Z",
                        location: "Remote",
                        format: "virtual",
                        viewerContext: "attending",
                    },
                ],
                strongestSharedEvent: {
                    id: "11111111-1111-4111-8111-111111111111",
                    slug: "design-review-week",
                    title: "Design Review Week",
                    startTime: "2026-04-02T18:00:00.000Z",
                    location: "Remote",
                    format: "virtual",
                    viewerContext: "attending",
                },
                whyNow:
                    "She is the strongest match across your upcoming events because you overlap more than once.",
                recommendedAction: "follow",
            },
        ],
        followUpNow: [
            {
                id: "33333333-3333-4333-8333-333333333333",
                fullName: "Grace Hopper",
                username: "grace",
                avatarUrl: null,
                headline: "Platform lead",
                location: "Calgary, AB",
                currentRole: "Platform lead",
                industry: "Infrastructure",
                companySize: "large",
                mutualConnectionsCount: 5,
                isInNetwork: true,
                followsViewer: false,
                isMutualFollow: false,
                sharedPastEventCount: 1,
                mostRecentSharedEventStartTime: "2026-03-20T18:00:00.000Z",
                sharedEvents: [
                    {
                        id: "44444444-4444-4444-8444-444444444444",
                        slug: "spring-summit",
                        title: "Spring Summit",
                        startTime: "2026-03-20T18:00:00.000Z",
                        location: "Calgary",
                        format: "in-person",
                    },
                ],
                strongestSharedEvent: {
                    id: "44444444-4444-4444-8444-444444444444",
                    slug: "spring-summit",
                    title: "Spring Summit",
                    startTime: "2026-03-20T18:00:00.000Z",
                    location: "Calgary",
                    format: "in-person",
                },
                whyNow:
                    "You were at the same event recently enough that the conversation still has context.",
                recommendedAction: "expand_context",
            },
        ],
        speakerMatches: [],
        starterProfiles: [],
        publicProfileCount: 0,
        ambientActivity: {
            publicTrackersToday: 18,
            newPublicProfilesThisWeek: 4,
            roomsWithFreshTrackingCount: 2,
        },
        ...overrides,
    };
}

function createCommunityCirclePage(
    overrides: Partial<MobileCommunityCirclePage> = {},
): MobileCommunityCirclePage {
    return {
        circle: {
            id: "33333333-3333-4333-8333-333333333333",
            slug: "design-systems",
            name: "Design Systems",
            description: "For interface engineers.",
            memberCount: 42,
        },
        isJoined: true,
        currentUser: {
            id: "22222222-2222-4222-8222-222222222222",
            fullName: "Ada Lovelace",
            username: "ada",
            avatarUrl: null,
        },
        members: [
            {
                id: "66666666-6666-4666-8666-666666666666",
                fullName: "Taylor",
                username: "taylor",
                avatarUrl: null,
                headline: "Design systems engineer",
            },
        ],
        upcomingEvents: [
            {
                id: "77777777-7777-4777-8777-777777777777",
                slug: "component-week",
                title: "Component Week",
                startTime: "2026-04-03T18:00:00.000Z",
                organizerName: "KureCal",
                organizerLogoUrl: null,
            },
        ],
        posts: [
            {
                id: "88888888-8888-4888-8888-888888888888",
                content: "Token hygiene\nHow often are you pruning old spacing values?",
                createdAt: "2026-03-22T12:00:00.000Z",
                author: {
                    id: "99999999-9999-4999-8999-999999999999",
                    fullName: "Jordan",
                    avatarUrl: null,
                },
                score: 5,
                userVote: 0,
                comments: [],
            },
        ],
        ...overrides,
    };
}

function createCommunityPostPage(
    overrides: Partial<MobileCommunityPostPage> = {},
): MobileCommunityPostPage {
    return {
        circle: {
            id: "33333333-3333-4333-8333-333333333333",
            slug: "design-systems",
            name: "Design Systems",
            description: "For interface engineers.",
            memberCount: 42,
        },
        isJoined: true,
        currentUser: {
            id: "22222222-2222-4222-8222-222222222222",
            fullName: "Ada Lovelace",
            username: "ada",
            avatarUrl: null,
        },
        members: [],
        upcomingEvents: [],
        post: {
            id: "88888888-8888-4888-8888-888888888888",
            content: "Design QA patterns\nHow are you testing typography changes?",
            createdAt: "2026-03-20T12:00:00.000Z",
            author: {
                id: "99999999-9999-4999-8999-999999999999",
                fullName: "Jordan",
                avatarUrl: null,
            },
            score: 6,
            userVote: 0,
            comments: [
                {
                    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    parentId: null,
                    content: "We snapshot every typography ramp.",
                    createdAt: "2026-03-21T12:00:00.000Z",
                    author: {
                        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                        fullName: "Taylor",
                        avatarUrl: null,
                    },
                    score: 1,
                    userVote: 0,
                    replies: [],
                },
            ],
        },
        ...overrides,
    };
}

function createPublicProfile(
    overrides: Partial<MobilePublicProfile> = {},
): MobilePublicProfile {
    return {
        id: "22222222-2222-4222-8222-222222222222",
        fullName: "Ada Lovelace",
        avatarUrl: null,
        username: "ada",
        headline: "Staff engineer",
        isViewerOwner: false,
        followerCount: 12,
        followingCount: 8,
        relationship: {
            isFollowing: false,
            isFollowedBy: true,
            isBlockedByUser: false,
            hasBlockedUser: false,
        },
        recentAttendingEvents: [
            {
                id: "11111111-1111-4111-8111-111111111111",
                slug: "design-review-week",
                title: "Design Review Week",
                startTime: "2026-04-02T18:00:00.000Z",
                location: "Remote",
            },
        ],
        careerProfile: {
            currentRole: "Staff engineer",
            seniority: "staff",
            industry: "Developer tools",
        },
        mutualConnections: [
            {
                id: "33333333-3333-4333-8333-333333333333",
                fullName: "Grace Hopper",
                username: "grace",
                avatarUrl: null,
                headline: "Platform lead",
            },
        ],
        mutualConnectionsCount: 1,
        ...overrides,
    };
}

function createSpeakerDetail(
    overrides: Partial<MobileSpeakerDetail> = {},
): MobileSpeakerDetail {
    return {
        id: "speaker-1",
        name: "Dana Scully",
        title: "AI Research Lead",
        company: "Signal Labs",
        bio: "Leads applied AI research and speaks about practical model delivery.",
        photoUrl: "https://example.com/dana.jpg",
        linkedinUrl: "https://linkedin.com/in/dana",
        twitterUrl: null,
        websiteUrl: "https://signals.example/dana",
        events: [
            {
                id: "11111111-1111-4111-8111-111111111111",
                slug: "design-review-week",
                title: "Design Review Week",
                startTime: "2026-04-02T18:00:00.000Z",
                location: "Remote",
                format: "virtual",
                isPastEvent: false,
            },
            {
                id: "44444444-4444-4444-8444-444444444444",
                slug: "spring-summit",
                title: "Spring Summit",
                startTime: "2026-03-20T18:00:00.000Z",
                location: "Calgary",
                format: "in-person",
                isPastEvent: true,
            },
        ],
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockOpenURL.mockClear();
    mockUseLocalSearchParams.mockReturnValue({});
    mockMobileApi.joinCommunityCircle.mockResolvedValue({ success: true });
    mockMobileApi.leaveCommunityCircle.mockResolvedValue({ success: true });
    mockMobileApi.createCommunityPost.mockResolvedValue({
        success: true,
        data: { id: "new-post" },
    });
    mockMobileApi.createCommunityComment.mockResolvedValue({
        success: true,
        data: { id: "new-comment" },
    });
    mockMobileApi.submitVote.mockResolvedValue({
        success: true,
        data: { success: true },
    });
    mockMobileApi.followUser.mockResolvedValue({ success: true });
    mockMobileApi.unfollowUser.mockResolvedValue({ success: true });
    mockMobileApi.getFollowStatus.mockResolvedValue({
        success: true,
        data: {
            isFollowing: false,
            isFollowedBy: true,
            isBlockedByUser: false,
            hasBlockedUser: false,
        },
    });
    mockMobileApi.getSpeaker.mockResolvedValue({
        success: true,
        data: createSpeakerDetail(),
    });
});

describe("mobile community screens", () => {
    it("renders the networking home screen and navigates to event and profile routes", async () => {
        mockMobileApi.getCommunityHome.mockResolvedValue({
            success: true,
            data: createCommunityHome(),
        });

        const view = renderWithProviders(<CommunityScreen />);

        expect(await screen.findByText("Events you're attending")).toBeTruthy();
        expect(screen.getByLabelText("Search network")).toBeTruthy();
        fireEvent.press(screen.getByLabelText("Open network settings"));
        expect(mockRouterPush).toHaveBeenCalledWith("/settings?focus=visibility");
        expect(screen.getByText("Saved events worth going to")).toBeTruthy();
        expect(screen.getByText("People you can meet")).toBeTruthy();
        expect(screen.getByText("Speakers on upcoming events")).toBeTruthy();
        expect(screen.queryByText("Speakers to know")).toBeNull();
        expect(screen.getByText("Follow up after events")).toBeTruthy();
        expect(screen.queryByText("Suggested for You")).toBeNull();
        expect(screen.queryByText(/room/i)).toBeNull();
        expect(screen.getAllByText("Dana Scully").length).toBeGreaterThan(0);
        expect(screen.getByText("AI Research Lead · Signal Labs")).toBeTruthy();
        expect(
            screen.getAllByTestId("community-speaker-card-row").length,
        ).toBeGreaterThan(0);
        expect(screen.queryByTestId("community-speaker-card-photo")).toBeNull();
        expect(screen.getAllByText(/Thu/).length).toBeGreaterThan(0);
        expect(
            screen.getAllByTestId("community-event-card-proof-row").length,
        ).toBeGreaterThan(0);
        expect(
            screen.getAllByTestId("community-event-card-image").length,
        ).toBeGreaterThan(0);
        expect(screen.queryByText("Attendee circle")).toBeNull();

        const serializedTree = JSON.stringify(view.toJSON());
        expect(serializedTree.indexOf("Events you're attending")).toBeLessThan(
            serializedTree.indexOf("Saved events worth going to"),
        );
        expect(serializedTree.indexOf("Saved events worth going to")).toBeLessThan(
            serializedTree.indexOf("People you can meet"),
        );

        fireEvent.press(screen.getAllByLabelText("Open speaker Dana Scully")[0]);
        expect(mockRouterPush).toHaveBeenCalledWith("/speaker/speaker-1");

        fireEvent.press(screen.getByLabelText("Open Dana Scully LinkedIn"));
        await waitFor(() => {
            expect(mockOpenURL).toHaveBeenCalledWith("https://linkedin.com/in/dana");
        });

        expect(
            screen.queryByLabelText("Open Dana Scully's event Design Review Week"),
        ).toBeNull();

        fireEvent.press(screen.getByLabelText("Open event Design Review Week"));
        expect(mockRouterPush).toHaveBeenCalledWith(
            "/event/11111111-1111-4111-8111-111111111111",
        );

        fireEvent.press(screen.getByLabelText("Open profile Grace Hopper"));
        expect(mockRouterPush).toHaveBeenCalledWith("/profile/grace");

        fireEvent.press(
            screen.getByLabelText("Open shared event Spring Summit"),
        );
        expect(mockRouterPush).toHaveBeenCalledWith(
            "/event/44444444-4444-4444-8444-444444444444",
        );
    });

    it("shows networking empty states when no event or people data is available", async () => {
        mockMobileApi.getCommunityHome.mockResolvedValue({
            success: true,
            data: createCommunityHome({
                summary: {
                    trackedUpcomingCount: 0,
                    visibleOpportunityCount: 0,
                    followUpCount: 0,
                    attendanceVisibilityEnabled: false,
                },
                upcomingMoments: [],
                peopleToMeet: [],
                followUpNow: [],
                ambientActivity: {
                    publicTrackersToday: 0,
                    newPublicProfilesThisWeek: 0,
                    roomsWithFreshTrackingCount: 0,
                },
            }),
        });

        renderWithProviders(<CommunityScreen />);

        expect(await screen.findByText("No attending events yet")).toBeTruthy();
        expect(screen.getAllByText("No speakers yet").length).toBeGreaterThan(0);
        expect(screen.getByText("No people yet")).toBeTruthy();
        expect(screen.getByText("No follow-up yet")).toBeTruthy();
        expect(screen.getByText("Explore events")).toBeTruthy();
    });

    it("replaces the speaker empty state with matched past speakers when upcoming lineups are empty", async () => {
        mockMobileApi.getCommunityHome.mockResolvedValue({
            success: true,
            data: createCommunityHome({
                upcomingMoments: [
                    {
                        ...createCommunityHome().upcomingMoments[0]!,
                        speakerPreview: [],
                    },
                ],
                speakerMatches: [
                    {
                        speaker: {
                            id: "speaker-match-1",
                            name: "Jamie Chen",
                            title: "AI Product Designer",
                            company: "Signal Labs",
                            photoUrl: "https://example.com/jamie-chen.jpg",
                            linkedinUrl: "https://linkedin.com/in/jamie-chen",
                            twitterUrl: null,
                            websiteUrl: null,
                            matchedProfileUsername: null,
                        },
                        event: {
                            id: "99999999-9999-4999-8999-999999999999",
                            slug: "ai-product-summit",
                            title: "AI Product Summit",
                            startTime: "2026-02-10T18:00:00.000Z",
                            location: "Remote",
                            format: "virtual",
                        },
                        matchReason: "Aligned with your interest in AI.",
                        isPastEvent: true,
                    },
                ],
            }),
        });

        renderWithProviders(<CommunityScreen />);

        expect(await screen.findByText("Speakers to know")).toBeTruthy();
        expect(screen.getByText("Jamie Chen")).toBeTruthy();
        expect(screen.queryByText("No speakers yet")).toBeNull();
        expect(screen.queryByText("Past speaker")).toBeNull();
        expect(
            screen.getAllByTestId("community-speaker-card-row").length,
        ).toBeGreaterThan(0);
        expect(screen.queryByTestId("community-speaker-card-photo")).toBeNull();

        fireEvent.press(screen.getByLabelText("Open speaker Jamie Chen"));
        expect(mockRouterPush).toHaveBeenCalledWith("/speaker/speaker-match-1");

        fireEvent.press(screen.getByLabelText("Open Jamie Chen LinkedIn"));
        await waitFor(() => {
            expect(mockOpenURL).toHaveBeenCalledWith(
                "https://linkedin.com/in/jamie-chen",
            );
        });

        expect(
            screen.queryByLabelText("Open Jamie Chen's event AI Product Summit"),
        ).toBeNull();

    });

    it("hides unsafe speaker shortcuts instead of opening raw deep links", async () => {
        mockMobileApi.getCommunityHome.mockResolvedValue({
            success: true,
            data: createCommunityHome({
                upcomingMoments: [
                    {
                        ...createCommunityHome().upcomingMoments[0]!,
                        speakerPreview: [],
                    },
                ],
                speakerMatches: [
                    {
                        speaker: {
                            id: "speaker-match-unsafe",
                            name: "Taylor Brooks",
                            title: "Data Lead",
                            company: "Signal Labs",
                            photoUrl: null,
                            linkedinUrl: "javascript:alert(1)",
                            twitterUrl: null,
                            websiteUrl: null,
                            matchedProfileUsername: null,
                        },
                        event: {
                            id: "99999999-9999-4999-8999-999999999999",
                            slug: "analytics-summit",
                            title: "Analytics Summit",
                            startTime: "2026-02-10T18:00:00.000Z",
                            location: "Remote",
                            format: "virtual",
                        },
                        matchReason: "Aligned with your analytics work.",
                        isPastEvent: true,
                    },
                ],
            }),
        });

        renderWithProviders(<CommunityScreen />);

        expect(await screen.findByText("Taylor Brooks")).toBeTruthy();
        expect(
            screen.queryByLabelText("Open Taylor Brooks LinkedIn"),
        ).toBeNull();

        fireEvent.press(screen.getByLabelText("Open speaker Taylor Brooks"));
        expect(mockRouterPush).toHaveBeenCalledWith("/speaker/speaker-match-unsafe");
        expect(mockOpenURL).not.toHaveBeenCalledWith("javascript:alert(1)");
    });

    it("opens the internal speaker page and routes to speaking events", async () => {
        mockUseLocalSearchParams.mockReturnValue({ id: "speaker-1" });
        mockMobileApi.getSpeaker.mockResolvedValue({
            success: true,
            data: createSpeakerDetail(),
        });

        renderWithProviders(<SpeakerScreen />);

        expect(await screen.findByText("Dana Scully")).toBeTruthy();
        expect(screen.getByText("AI Research Lead · Signal Labs")).toBeTruthy();
        expect(screen.getByText("Speaking events")).toBeTruthy();
        expect(screen.getByTestId("speaker-detail-photo")).toBeTruthy();

        fireEvent.press(screen.getByLabelText("Open Dana Scully LinkedIn"));
        await waitFor(() => {
            expect(mockOpenURL).toHaveBeenCalledWith("https://linkedin.com/in/dana");
        });

        fireEvent.press(screen.getByLabelText("Open upcoming event Design Review Week"));
        expect(mockRouterPush).toHaveBeenCalledWith(
            "/event/11111111-1111-4111-8111-111111111111",
        );
    });

    it("hides unsafe social links on the internal speaker page", async () => {
        mockUseLocalSearchParams.mockReturnValue({ id: "speaker-1" });
        mockMobileApi.getSpeaker.mockResolvedValue({
            success: true,
            data: {
                ...createSpeakerDetail(),
                linkedinUrl: "javascript:alert(1)",
                twitterUrl: null,
                websiteUrl: null,
            },
        });

        renderWithProviders(<SpeakerScreen />);

        expect(await screen.findByText("Dana Scully")).toBeTruthy();
        expect(screen.queryByLabelText("Open Dana Scully LinkedIn")).toBeNull();
    });

    it("shows a visibility CTA when attendance visibility is off", async () => {
        mockMobileApi.getCommunityHome.mockResolvedValue({
            success: true,
            data: createCommunityHome({
                summary: {
                    trackedUpcomingCount: 2,
                    visibleOpportunityCount: 2,
                    followUpCount: 1,
                    attendanceVisibilityEnabled: false,
                },
            }),
        });

        renderWithProviders(<CommunityScreen />);

        expect(
            await screen.findByText(
                "Enable visibility so attendees can find you.",
            ),
        ).toBeTruthy();

        fireEvent.press(screen.getByLabelText("Open visibility settings"));
        expect(mockRouterPush).toHaveBeenCalledWith("/settings?focus=visibility");
    });

    it("shows real fallback events for cold-start users even when attendee signal is still sparse", async () => {
        mockMobileApi.getCommunityHome.mockResolvedValue({
            success: true,
            data: createCommunityHome({
                summary: {
                    trackedUpcomingCount: 0,
                    visibleOpportunityCount: 0,
                    followUpCount: 0,
                    attendanceVisibilityEnabled: false,
                },
                upcomingMoments: [
                    {
                        id: "66666666-6666-4666-8666-666666666666",
                        slug: "mcp-dev-summit",
                        title: "MCP Dev Summit",
                        startTime: "2026-04-02T00:00:00.000Z",
                        imageUrl: null,
                        location: "Remote",
                        format: "virtual",
                        viewerContext: "saved",
                        recentTrackerCount: 0,
                        totalAttendeeCount: 0,
                        visibleAttendeeCount: 0,
                        networkAttendingCount: 0,
                        relationshipAttendeeCount: 0,
                        primaryReason: "Attendee visibility is still building around this event",
                        whyNow:
                            "This is a real upcoming event worth tracking while attendee signal catches up.",
                        newVisibleAttendeeCount: 0,
                        recommendedAction: "open_event",
                        attendeePreview: [],
                        speakerPreview: [],
                    },
                ],
                peopleToMeet: [],
                followUpNow: [],
                starterProfiles: [],
                publicProfileCount: 42,
                ambientActivity: {
                    publicTrackersToday: 0,
                    newPublicProfilesThisWeek: 6,
                    roomsWithFreshTrackingCount: 0,
                },
            }),
        });

        renderWithProviders(<CommunityScreen />);

        expect(await screen.findByText("Saved events worth going to")).toBeTruthy();
        expect(screen.getAllByText("MCP DEV SUMMIT").length).toBeGreaterThan(0);
        expect(screen.queryByTestId("community-event-card-proof-row")).toBeNull();
        expect(screen.queryByText("People Already Here")).toBeNull();
        expect(screen.queryByText("Suggested for You")).toBeNull();
        expect(screen.queryByText(/room/i)).toBeNull();
    });

    it("shows the home error state when the community query fails", async () => {
        mockMobileApi.getCommunityHome.mockResolvedValue({
            success: false,
            error: "Failed to load starter community events.",
        });

        renderWithProviders(<CommunityScreen />);

        expect(await screen.findByText("Network unavailable")).toBeTruthy();
        expect(
            screen.getByText("Failed to load starter community events."),
        ).toBeTruthy();
        expect(screen.getByText("Try again")).toBeTruthy();
    });

    it("retries the community home query from the error state", async () => {
        mockMobileApi.getCommunityHome
            .mockResolvedValueOnce({
                success: false,
                error: "Failed to load starter community events.",
            })
            .mockResolvedValueOnce({
                success: true,
                data: createCommunityHome(),
            });

        renderWithProviders(<CommunityScreen />);

        expect(
            await screen.findByText("Failed to load starter community events."),
        ).toBeTruthy();

        fireEvent.press(screen.getByText("Try again"));

        await waitFor(() => {
            expect(mockMobileApi.getCommunityHome).toHaveBeenCalledTimes(2);
        });

        expect(await screen.findByText("Events you're attending")).toBeTruthy();
    });

    it("publishes a new post from the circle screen", async () => {
        mockUseLocalSearchParams.mockReturnValue({ slug: "design-systems" });
        mockMobileApi.getCommunityCircle.mockResolvedValue({
            success: true,
            data: createCommunityCirclePage(),
        });

        renderWithProviders(<CommunityCircleScreen />);

        expect(await screen.findByText("Start a conversation")).toBeTruthy();
        fireEvent.changeText(
            screen.getByPlaceholderText("Share something with Design Systems"),
            "Native circle post",
        );
        fireEvent.press(screen.getByText("Publish post"));

        await waitFor(() => {
            expect(mockMobileApi.createCommunityPost).toHaveBeenCalledWith({
                circleId: "33333333-3333-4333-8333-333333333333",
                circleSlug: "design-systems",
                content: "Native circle post",
            });
        });
    });

    it("votes and replies from the native post screen", async () => {
        mockUseLocalSearchParams.mockReturnValue({
            postId: "88888888-8888-4888-8888-888888888888",
        });
        mockMobileApi.getCommunityPost.mockResolvedValue({
            success: true,
            data: createCommunityPostPage(),
        });

        renderWithProviders(<CommunityPostScreen />);

        expect(await screen.findByText("Design QA patterns")).toBeTruthy();

        fireEvent.press(screen.getByText("Upvote"));
        await waitFor(() => {
            expect(mockMobileApi.submitVote).toHaveBeenCalledWith({
                entityType: "post",
                entityId: "88888888-8888-4888-8888-888888888888",
                circleSlug: "design-systems",
                voteType: 1,
            });
        });

        fireEvent.changeText(
            screen.getByPlaceholderText("Write your reply"),
            "A native reply",
        );
        fireEvent.press(screen.getByText("Send reply"));

        await waitFor(() => {
            expect(mockMobileApi.createCommunityComment).toHaveBeenCalledWith({
                postId: "88888888-8888-4888-8888-888888888888",
                circleSlug: "design-systems",
                content: "A native reply",
            });
        });
    });

    it("renders the public profile screen and handles follow toggles plus event routing", async () => {
        mockUseLocalSearchParams.mockReturnValue({ username: "ada" });
        mockMobileApi.getPublicProfile.mockResolvedValue({
            success: true,
            data: createPublicProfile(),
        });

        renderWithProviders(<PublicProfileScreen />);

        expect(await screen.findByText("Recent events")).toBeTruthy();
        expect(screen.getByText("Mutual context")).toBeTruthy();

        fireEvent.press(screen.getByLabelText("Follow Ada Lovelace"));
        await waitFor(() => {
            expect(mockMobileApi.followUser).toHaveBeenCalledWith(
                "22222222-2222-4222-8222-222222222222",
            );
        });

        fireEvent.press(screen.getByLabelText("Unfollow Ada Lovelace"));
        await waitFor(() => {
            expect(mockMobileApi.unfollowUser).toHaveBeenCalledWith(
                "22222222-2222-4222-8222-222222222222",
            );
        });

        fireEvent.press(
            screen.getByLabelText("Open upcoming event Design Review Week"),
        );
        expect(mockRouterPush).toHaveBeenCalledWith(
            "/event/11111111-1111-4111-8111-111111111111",
        );
    });
});
