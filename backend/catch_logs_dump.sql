--
-- PostgreSQL database dump
--

\restrict ZnUsjUFDRMy5OIbhm76XhXQGLJGBMh5S6v3I4AmgiSVdfGEFMrY89schd5QJ4ax

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-1.pgdg22.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
-- Name: catch_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.catch_logs (
    id bigint NOT NULL,
    batch_id character varying(255) NOT NULL,
    user_id bigint NOT NULL,
    species character varying(255) NOT NULL,
    drying_method character varying(255) NOT NULL,
    batch_size double precision NOT NULL,
    weight double precision NOT NULL,
    harvest_date date NOT NULL,
    shelf_life integer NOT NULL,
    price double precision NOT NULL,
    image_urls json,
    quality_score double precision DEFAULT '0'::double precision NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    location public.geography(Point,4326),
    CONSTRAINT catch_logs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.catch_logs OWNER TO postgres;

--
-- Name: catch_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.catch_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.catch_logs_id_seq OWNER TO postgres;

--
-- Name: catch_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.catch_logs_id_seq OWNED BY public.catch_logs.id;


--
-- Name: catch_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catch_logs ALTER COLUMN id SET DEFAULT nextval('public.catch_logs_id_seq'::regclass);


--
-- Data for Name: catch_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.catch_logs (id, batch_id, user_id, species, drying_method, batch_size, weight, harvest_date, shelf_life, price, image_urls, quality_score, status, created_at, updated_at, location) FROM stdin;
\.


--
-- Name: catch_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.catch_logs_id_seq', 1, false);


--
-- Name: catch_logs catch_logs_batch_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catch_logs
    ADD CONSTRAINT catch_logs_batch_id_unique UNIQUE (batch_id);


--
-- Name: catch_logs catch_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catch_logs
    ADD CONSTRAINT catch_logs_pkey PRIMARY KEY (id);


--
-- Name: catch_logs catch_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catch_logs
    ADD CONSTRAINT catch_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: TABLE catch_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.catch_logs TO anon;
GRANT ALL ON TABLE public.catch_logs TO authenticated;
GRANT ALL ON TABLE public.catch_logs TO service_role;


--
-- Name: SEQUENCE catch_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.catch_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.catch_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.catch_logs_id_seq TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict ZnUsjUFDRMy5OIbhm76XhXQGLJGBMh5S6v3I4AmgiSVdfGEFMrY89schd5QJ4ax

