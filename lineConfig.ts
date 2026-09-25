import { Team } from './types';

export interface LineRecipient {
    name: string;
    phone: string;
}

export interface LineAccountConfig {
    id: string;
    lineId: string;       // e.g. @HIKCCTV
    label: string;        // Display label
    teams: Team[];        // Which teams this LINE@ maps to
    recipients: LineRecipient[];
}

// Shared SEC address (same for all teams)
export const SEC_ADDRESS = {
    company: 'บริษัท เอสอีซี เทคโนโลยี จำกัด (แผนกส่งเคลม)',
    companyEn: 'SEC Technology Co., Ltd. (Claim Department)',
    address: '106/51 หมู่ที่ 9 ตำบลทุ่งสุขลา อำเภอศรีราชา จังหวัดชลบุรี 20230',
    addressEn: '106/51 Moo 9, Tung Sukhla, Sri Racha, Chonburi 20230',
};

export const LINE_ACCOUNTS: LineAccountConfig[] = [
    {
        id: 'hikcctv',
        lineId: '@HIKCCTV',
        label: '@HIKCCTV (Hikvision)',
        teams: [Team.HIKVISION],
        recipients: [
            { name: 'คุณบลู', phone: '092-389-3000' },
            { name: 'คุณตั้ม', phone: '063-076-0700' },
            { name: 'คุณต๋อง', phone: '062-217-5766' },
        ],
    },
    {
        id: 'dahuacctv',
        lineId: '@DAHUACCTV',
        label: '@DAHUACCTV (Dahua)',
        teams: [Team.DAHUA],
        recipients: [
            { name: 'คุณเอ็กซ์', phone: '062-217-6477' },
            { name: 'คุณชิว', phone: '098-624-9393' },
        ],
    },
    {
        id: 'netlink',
        lineId: '@NETLINK',
        label: '@NETLINK (Network / UNV / Online)',
        teams: [Team.TEAM_C, Team.TEAM_G],
        recipients: [
            { name: 'คุณชุติมา', phone: '092-465-4888' },
            { name: 'คุณพงศกร', phone: '098-660-7500' },
            { name: 'คุณชยพล', phone: '092-689-7111' },
        ],
    },
    {
        id: 'secpower',
        lineId: '@SECPOWER',
        label: '@SECPOWER (UPS / Power)',
        teams: [Team.TEAM_E],
        recipients: [
            { name: 'คุณชุติมา', phone: '092-465-4888' },
            { name: 'คุณพงศกร', phone: '098-660-7500' },
            { name: 'คุณชยพล', phone: '092-689-7111' },
        ],
    },
    {
        id: 'cctvhub',
        lineId: '@CCTVHUB',
        label: '@CCTVHUB',
        teams: [Team.HIKVISION, Team.TEAM_G],
        recipients: [
            { name: 'คุณบลู', phone: '092-389-3000' },
            { name: 'คุณตั้ม', phone: '063-076-0700' },
            { name: 'คุณต๋อง', phone: '062-217-5766' },
        ],
    },
];

// Helper to find a LINE account config by its id
export const getLineAccountById = (id: string): LineAccountConfig | undefined =>
    LINE_ACCOUNTS.find(la => la.id === id);
