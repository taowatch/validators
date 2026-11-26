-- One row per block the collector sampled. Samples cascade with their snapshot on prune.
CREATE TABLE snapshot (
    block       bigint      PRIMARY KEY,
    ts          timestamptz NOT NULL,               -- Timestamp.Now of the block
    kind        text        NOT NULL,               -- 'head' | 'backfill'
    day         date        NOT NULL,               -- UTC day this snapshot stands for
    keep_daily  boolean     NOT NULL DEFAULT false, -- the one sample kept for `day` after pruning
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX snapshot_ts ON snapshot (ts);
CREATE UNIQUE INDEX snapshot_daily ON snapshot (day) WHERE keep_daily;

-- Root side: BasketRate and root stake per validator hotkey.
CREATE TABLE root_sample (
    block       bigint  NOT NULL REFERENCES snapshot (block) ON DELETE CASCADE,
    hotkey      text    NOT NULL,
    rate_bits   numeric,                            -- BasketRate.bits; ÷ 2^32 when used. NULL: no rate at that block
    root_stake  double precision NOT NULL,          -- τ (TotalHotkeyAlpha(hk, 0) / 1e9)
    PRIMARY KEY (block, hotkey)
);

-- Alpha side: one share pool per (validator hotkey, subnet).
CREATE TABLE alpha_sample (
    block   bigint  NOT NULL REFERENCES snapshot (block) ON DELETE CASCADE,
    hotkey  text    NOT NULL,
    netuid  integer NOT NULL,
    alpha   double precision NOT NULL,              -- alpha (TotalHotkeyAlpha / 1e9); 0 when the pool did not exist
    pps     double precision,                       -- alpha rao per pool share; NULL when no shares
    epoch   bigint,                                 -- AlphaSharePoolEpoch
    PRIMARY KEY (block, hotkey, netuid)
);
CREATE INDEX alpha_sample_hotkey ON alpha_sample (hotkey, netuid);

-- Subnet pool reserves → alpha price = tao / alpha_in.
CREATE TABLE subnet_sample (
    block    bigint  NOT NULL REFERENCES snapshot (block) ON DELETE CASCADE,
    netuid   integer NOT NULL,
    tao      double precision NOT NULL,
    alpha_in double precision NOT NULL,
    PRIMARY KEY (block, netuid)
);

-- Latest state, overwritten on each head run.
CREATE TABLE validator (
    hotkey      text PRIMARY KEY,
    coldkey     text,
    name        text,
    take        double precision NOT NULL DEFAULT 0, -- 0..1
    nominators  integer,
    has_basket  boolean NOT NULL DEFAULT false,
    nav         double precision,                    -- rao, realizable
    spot_nav    double precision,                    -- rao
    shares      double precision,                    -- basket shares outstanding
    deposited   double precision,                    -- rao, lifetime
    redeemed    double precision,                    -- rao, lifetime
    holdings    jsonb,                               -- [[netuid, alpha, spot_rao, realizable_rao]]
    block       bigint,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subnet (
    netuid integer PRIMARY KEY,
    name   text
);

-- ChildKeys(parent, netuid) with each child's ChildkeyTake: [[proportion, child, take]].
CREATE TABLE childkey (
    hotkey   text    NOT NULL,
    netuid   integer NOT NULL,
    children jsonb   NOT NULL,
    PRIMARY KEY (hotkey, netuid)
);
