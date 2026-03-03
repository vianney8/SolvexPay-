--
-- PostgreSQL database dump
--

\restrict smqhwIcMzxir4JCDdTR0bi9XfE81yGzBEXKcZOmjVK4agTsLL809Bc1aiVKMlzt

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    name text NOT NULL,
    key_prefix text NOT NULL,
    key_hash text NOT NULL,
    environment text DEFAULT 'live'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    full_key text
);


--
-- Name: payment_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_links (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    name text NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'XOF'::text NOT NULL,
    description text,
    slug text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    times_used numeric(10,0) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    redirect_url text,
    image_url text
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'XOF'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    provider text,
    phone_number text,
    reference text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    phone character varying,
    password_hash character varying
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    balance_xof numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.api_keys (id, user_id, name, key_prefix, key_hash, environment, is_active, last_used_at, created_at, full_key) FROM stdin;
1d2de4ce-acb9-44ea-97c2-76059f0114c2	6dbafd5a-a0a4-46e8-8c22-b9a3560b2d65	achat pcs 	sk_45ae2618e	a102c51f8989cc5e02934cecea9379194168b13abc02dc72754a5f28a11e1f23	live	t	\N	2026-02-08 09:45:23.787961	\N
33e0b084-77a9-436f-93d2-4c20755e9cb4	6dbafd5a-a0a4-46e8-8c22-b9a3560b2d65	Bkjj	sk_77877b174	19f0404b32634505c2a826f67af6680d367dc3eb1ed0fa4b466865bd7ad7d084	test	t	\N	2026-02-08 09:45:48.503755	\N
\.


--
-- Data for Name: payment_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_links (id, user_id, name, amount, currency, description, slug, is_active, times_used, created_at, redirect_url, image_url) FROM stdin;
1883dc7c-2d4b-4dbe-b3cd-a6995a6bdd5a	912a3d35-d80f-45ec-8395-5aea67bc2b0f	Bkjj	2500.00	XOF	\N	058886459509eb34	t	0	2026-02-08 08:26:14.004401	\N	\N
820d3bc2-37bf-4a45-b987-75a360206880	082fe874-0276-47b7-a3ce-6f5f78588e64	achat pcs	2000.00	XOF	Bbf	c71929448e595c44	t	1	2026-02-20 13:30:37.428173	\N	/uploads/1771594214834-195816498.jpg
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (sid, sess, expire) FROM stdin;
9JckMYTIEIuNxc3IYDT6lxlKypsvzoj9	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-27T13:01:47.755Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "userId": "082fe874-0276-47b7-a3ce-6f5f78588e64"}	2026-03-05 09:10:33
NF34dv2-0PdT7bYeTxCgVU9-biD49OLA	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-27T13:22:00.460Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "userId": "082fe874-0276-47b7-a3ce-6f5f78588e64"}	2026-03-04 18:52:23
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, user_id, type, amount, currency, status, provider, phone_number, reference, description, created_at) FROM stdin;
ec2a2f32-2a74-4d61-a7a4-3e78e19ef130	082fe874-0276-47b7-a3ce-6f5f78588e64	deposit	2000.00	XOF	pending	solvexpay	22555755	pay_mluxhpww_aec225f087760f19	Paiement SolvexPay: achat pcs	2026-02-20 13:31:18.757153
00e9d722-3261-423e-8514-4f228c474673	082fe874-0276-47b7-a3ce-6f5f78588e64	deposit	5000.00	XOF	pending	sendavapay		pay_mluzl7iv_54b0c289247f390a	Depot SolvexPay	2026-02-20 14:30:00.771412
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, first_name, last_name, profile_image_url, created_at, updated_at, phone, password_hash) FROM stdin;
181ebdc0-036b-458b-9340-10c159e95c08	testuser_ZR4E2B@example.com	Test	User VdQ6HN	\N	2026-02-08 00:13:42.299094	2026-02-08 00:13:42.299094	+22177123456	$2b$10$v/mTg0Ppy8/VgiuyVUly2eiHv1jl2biT9SeuNMAy6wx4d4ubEaD0W
5d82af2a-77c8-4076-88fc-b1621d5d2dcc	vianneyessou@gmail.com	Jean	Dupont	\N	2026-02-08 00:15:50.165419	2026-02-08 00:15:50.165419	+22508050805	$2b$10$Q1gZMHzC5dG5heBx.BGGJej7tlIyLoHewdYj16hlwOTWdhUzdGKrO
912a3d35-d80f-45ec-8395-5aea67bc2b0f	vianneyessou01@gmail.com	Jean		\N	2026-02-08 01:28:12.874249	2026-02-08 01:28:12.874249	+22958274430	$2b$10$C.hfVWdlvg8qws/WvPTFC.CEPKzABBsa67RBGU2Gs28lUnQ4R/DaO
6dbafd5a-a0a4-46e8-8c22-b9a3560b2d65	v@gmail.com	Hh		\N	2026-02-08 09:24:50.459219	2026-02-08 09:24:50.459219	+22958274430	$2b$10$.RkSj9Y1DApdE3NRaCryFuFxQMrKVnBm0sBSqU9WgfhuVmqRKvADS
082fe874-0276-47b7-a3ce-6f5f78588e64	sikatexte@gmail.com	Njompuv Joss 		\N	2026-02-20 13:01:47.747685	2026-02-20 13:22:55.087	+22922222222	$2b$10$IR2IVd1eYj1Z8SOoqXk2Yea6iFMw0QXGBjputUB2Wohe0A171nYv6
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallets (id, user_id, balance_xof, created_at, updated_at) FROM stdin;
93b7b283-07b6-4c9e-add2-940f7dcf9f5e	181ebdc0-036b-458b-9340-10c159e95c08	0.00	2026-02-08 00:13:42.401961	2026-02-08 00:13:42.401961
111df5b0-73ac-4a84-a742-a7a58589eadf	5d82af2a-77c8-4076-88fc-b1621d5d2dcc	0.00	2026-02-08 00:15:53.061438	2026-02-08 00:15:53.061438
6fb184e1-dd10-49c5-81ce-dd97e64a0c1c	912a3d35-d80f-45ec-8395-5aea67bc2b0f	0.00	2026-02-08 01:28:13.763032	2026-02-08 01:28:13.763032
65a74cae-046b-46fa-bceb-2c9aab000824	6dbafd5a-a0a4-46e8-8c22-b9a3560b2d65	0.00	2026-02-08 09:24:51.128399	2026-02-08 09:24:51.128399
c636f16f-f2d2-44fb-9d5f-a0bf13ec43d3	082fe874-0276-47b7-a3ce-6f5f78588e64	0.00	2026-02-20 13:01:49.616661	2026-02-20 13:01:49.616661
\.


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: payment_links payment_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_links
    ADD CONSTRAINT payment_links_pkey PRIMARY KEY (id);


--
-- Name: payment_links payment_links_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_links
    ADD CONSTRAINT payment_links_slug_unique UNIQUE (slug);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_unique UNIQUE (user_id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_api_keys_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_user ON public.api_keys USING btree (user_id);


--
-- Name: idx_payment_links_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_links_user ON public.payment_links USING btree (user_id);


--
-- Name: idx_transactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_user ON public.transactions USING btree (user_id);


--
-- PostgreSQL database dump complete
--

\unrestrict smqhwIcMzxir4JCDdTR0bi9XfE81yGzBEXKcZOmjVK4agTsLL809Bc1aiVKMlzt

